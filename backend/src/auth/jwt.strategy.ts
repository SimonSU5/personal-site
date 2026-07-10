import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfigService } from '../config/config.service';

/**
 * SPEC §2.3 / §4.3 — Passport-JWT strategy for access tokens.
 *
 * Security invariants:
 * - `algorithms: ['HS256']` PIN — forbids `alg: none` and any algorithm
 *   confusion (the verifier will reject a tampered/alg-none token before the
 *   handler runs). AC-16.
 * - `clockTolerance <= 30s` — tolerates minor NTP skew between issuer and
 *   verifier without accepting stale tokens broadly.
 * - Bearer extracted ONLY from the Authorization header.
 * - `secretOrKeyProvider` reads the access secret via AppConfigService (NEVER
 *   process.env in the strategy).
 *
 * The verifier returns the payload (signature already verified by passport-
 * jwt); it does NOT load the user here. The `/me` handler does a FRESH
 * `findById` so a deleted user is caught (AC-ME-deleted) and the JWT payload
 * is never trusted for identity.
 */

export interface JwtAccessPayload {
  sub: string;
  username: string;
  role: 'admin' | 'user';
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // FORBID alg:none / algorithm confusion (AC-16).
      algorithms: ['HS256'],
      ignoreExpiration: false,
      // passport-jwt forwards these to jsonwebtoken.verify; tolerate <=30s
      // clock skew (AC-JWT-config).
      jsonWebTokenOptions: { clockTolerance: 30 },
      secretOrKeyProvider: (
        _requestType,
        _tokenOrPayload,
        done,
      ): void => {
        try {
          done(null, config.jwtAccessSecret);
        } catch (err) {
          done(err as Error);
        }
      },
    });
  }

  /**
   * passport-jwt calls this after successfully verifying signature + expiry.
   * We pass the payload through as `req.user` (with `id = sub`). The handler
   * re-fetches the user from the DB; we do NOT trust the payload for the
   * actual identity response.
   */
  validate(payload: JwtAccessPayload): AuthenticatedUser {
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
