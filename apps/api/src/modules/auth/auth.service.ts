import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfig } from '../../config/app.config';
import type { AuthResponse, AuthTokens, RegisterRequest, LoginRequest } from '@finance-os/contracts';

/**
 * Auth service — the security-critical core.
 *
 * Token model:
 *   Access token: short-lived JWT (15m default), stateless, signed with
 *     JWT_ACCESS_SECRET. Carries { sub: userId, sid: sessionId }.
 *   Refresh token: long-lived JWT (30d default), signed with separate
 *     JWT_REFRESH_SECRET. We also store a SHA-256 hash of the token in
 *     the sessions table — this lets us:
 *       (a) revoke individual sessions
 *       (b) detect refresh token reuse (theft) and revoke the chain
 *
 * Refresh rotation:
 *   Each refresh issues a new pair AND marks the old session as
 *   replacedById -> new session. If a refresh token is presented for a
 *   session that's already been replaced, we treat it as theft: revoke the
 *   entire ancestor chain immediately.
 */

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  async register(dto: RegisterRequest, deviceName?: string, meta?: AuthMeta): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19_456, // ~19 MB, OWASP recommended for argon2id
      timeCost: 2,
      parallelism: 1,
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
    });

    // Seed default categories for the new user. Doing this synchronously so
    // the new user has categories visible on their first dashboard load.
    await this.seedDefaultCategoriesFor(user.id);

    const tokens = await this.issueTokenPair(user.id, deviceName, meta);

    return {
      user: serializeUser(user),
      tokens,
    };
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(dto: LoginRequest, meta?: AuthMeta): Promise<AuthResponse> {
    // Always do the hash compare even on missing user, to avoid timing oracle.
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const dummyHash = '$argon2id$v=19$m=19456,t=2,p=1$dGltaW5nLWZpeGVk$dGltaW5nLWZpeGVk';

    const valid = await argon2.verify(user?.passwordHash ?? dummyHash, dto.password).catch(() => false);

    if (!user || !valid || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokenPair(user.id, dto.deviceName, meta);
    return {
      user: serializeUser(user),
      tokens,
    };
  }

  // ---------------------------------------------------------------------------
  // Refresh — with rotation + reuse detection
  // ---------------------------------------------------------------------------

  async refresh(refreshToken: string, meta?: AuthMeta): Promise<AuthTokens> {
    // 1. Verify signature/expiry first — cheap, signs out invalid tokens fast.
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Look up the session by refresh hash.
    const refreshHash = sha256(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshHash },
      include: { user: true },
    });

    if (!session || session.userId !== payload.sub || session.user.deletedAt) {
      // Token signature is valid but DB doesn't recognize it — likely revoked.
      throw new UnauthorizedException('Session not found');
    }

    if (session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // 3. Reuse detection: if this session has already been replaced, the
    // token presenter is using an old token. Treat as compromise — revoke
    // the entire forward chain and refuse.
    if (session.replacedById) {
      this.logger.warn(`Refresh token reuse detected for user ${session.userId}, revoking chain`);
      await this.revokeChainFrom(session.id);
      throw new ForbiddenException('Refresh token reuse detected; please sign in again');
    }

    // 4. Issue new pair + mark old session as replaced.
    const newTokens = await this.issueTokenPair(session.userId, session.deviceName ?? undefined, meta);

    // The new session was just created above; link it as replacement of the old.
    const newSession = await this.prisma.session.findUnique({
      where: { refreshHash: sha256(newTokens.refreshToken) },
    });
    if (newSession) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { replacedById: newSession.id, revokedAt: new Date() },
      });
    }

    return newTokens;
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  async logout(refreshToken: string): Promise<void> {
    const refreshHash = sha256(refreshToken);
    await this.prisma.session
      .update({
        where: { refreshHash },
        data: { revokedAt: new Date() },
      })
      .catch(() => {
        // Idempotent — logging out a missing session shouldn't error.
      });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Password reset
  // ---------------------------------------------------------------------------

  async forgotPassword(email: string): Promise<{ resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak whether the email exists. Return a fake-success.
      return {};
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // In production, send via email service. For dev/return path, return token.
    if (this.config.isDev) {
      return { resetToken: rawToken };
    }
    // TODO: integrate email service (Resend / Postmark / SES) — Phase 5
    return {};
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = sha256(rawToken);
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new UnauthorizedException('Reset link is invalid or expired');
    }

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all sessions on password change — best practice
      this.prisma.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async issueTokenPair(
    userId: string,
    deviceName?: string,
    meta?: AuthMeta,
  ): Promise<AuthTokens> {
    // Generate a session ID up front so it's embedded in both tokens.
    const sessionId = randomUuid();

    const accessTtl = parseDuration(this.config.env.JWT_ACCESS_TTL);
    const refreshTtl = parseDuration(this.config.env.JWT_REFRESH_TTL);

    const now = Math.floor(Date.now() / 1000);
    const accessExp = now + accessTtl;
    const refreshExp = now + refreshTtl;

    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid: sessionId },
      { secret: this.config.env.JWT_ACCESS_SECRET, expiresIn: accessTtl },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, sid: sessionId, typ: 'refresh' } satisfies RefreshPayload,
      { secret: this.config.env.JWT_REFRESH_SECRET, expiresIn: refreshTtl },
    );

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId,
        refreshHash: sha256(refreshToken),
        deviceName: deviceName ?? null,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
        expiresAt: new Date(refreshExp * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessExp,
      refreshTokenExpiresAt: refreshExp,
    };
  }

  /** Revoke a session and any descendants in its replacement chain. */
  private async revokeChainFrom(sessionId: string): Promise<void> {
    // Walk forward through replacedById links and revoke each.
    let current: string | null = sessionId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const updated: { replacedById: string | null } = await this.prisma.session.update({
        where: { id: current },
        data: { revokedAt: new Date() },
        select: { replacedById: true },
      });
      current = updated.replacedById;
    }
  }

  /**
   * Seed default categories for a new user. Kept lean to not delay register.
   * Full set of system defaults is in seed.ts; this is the user-creation
   * subset (the most common categories).
   */
  private async seedDefaultCategoriesFor(userId: string): Promise<void> {
    const defaults: Array<{
      name: string;
      icon: string;
      colorHex: string;
      type: 'INCOME' | 'EXPENSE';
    }> = [
      // Expense
      { name: 'Food & Dining', icon: 'utensils', colorHex: '#F59E0B', type: 'EXPENSE' },
      { name: 'Groceries', icon: 'shopping-cart', colorHex: '#10B981', type: 'EXPENSE' },
      { name: 'Transport', icon: 'car', colorHex: '#3B82F6', type: 'EXPENSE' },
      { name: 'Bills & Utilities', icon: 'zap', colorHex: '#8B5CF6', type: 'EXPENSE' },
      { name: 'Shopping', icon: 'shopping-bag', colorHex: '#EC4899', type: 'EXPENSE' },
      { name: 'Health', icon: 'heart-pulse', colorHex: '#EF4444', type: 'EXPENSE' },
      { name: 'Entertainment', icon: 'film', colorHex: '#A855F7', type: 'EXPENSE' },
      { name: 'Education', icon: 'graduation-cap', colorHex: '#0EA5E9', type: 'EXPENSE' },
      { name: 'Rent', icon: 'home', colorHex: '#F97316', type: 'EXPENSE' },
      { name: 'Other Expense', icon: 'circle', colorHex: '#94A3B8', type: 'EXPENSE' },
      // Income
      { name: 'Salary', icon: 'briefcase', colorHex: '#10B981', type: 'INCOME' },
      { name: 'Freelance', icon: 'laptop', colorHex: '#6366F1', type: 'INCOME' },
      { name: 'Dividends', icon: 'trending-up', colorHex: '#22C55E', type: 'INCOME' },
      { name: 'Interest', icon: 'percent', colorHex: '#06B6D4', type: 'INCOME' },
      { name: 'Gift', icon: 'gift', colorHex: '#F472B6', type: 'INCOME' },
      { name: 'Other Income', icon: 'circle', colorHex: '#94A3B8', type: 'INCOME' },
    ];

    await this.prisma.category.createMany({
      data: defaults.map((d) => ({
        userId,
        name: d.name,
        icon: d.icon,
        colorHex: d.colorHex,
        type: d.type,
        isSystem: true,
      })),
      skipDuplicates: true,
    });
  }
}

// =============================================================================
// Helpers
// =============================================================================

export type AuthMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type RefreshPayload = {
  sub: string;
  sid: string;
  typ: 'refresh';
  iat?: number;
  exp?: number;
};

const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

const randomUuid = (): string => {
  // Use Node's built-in randomUUID if available, else fall back to randomBytes
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:crypto').randomUUID();
  } catch {
    return randomBytes(16).toString('hex');
  }
};

/** Parse "15m" / "30d" / "1h" into seconds. Defaults to seconds if no suffix. */
const parseDuration = (s: string): number => {
  const m = s.match(/^(\d+)([smhd])?$/);
  if (!m) return parseInt(s, 10) || 0;
  const n = parseInt(m[1]!, 10);
  switch (m[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 60 * 60;
    case 'd':
      return n * 60 * 60 * 24;
    default:
      return n;
  }
};

const serializeUser = (user: {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  createdAt: user.createdAt.toISOString(),
});
