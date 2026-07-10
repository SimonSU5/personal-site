import { SetMetadata } from '@nestjs/common';

/**
 * SPEC §4.3 — `@Public()` access-control primitive.
 *
 * Marks a handler (or controller) as NOT requiring a valid Bearer access JWT.
 * `JwtAuthGuard.canActivate` short-circuits when this metadata is present, so
 * `@Public()` routes (login / refresh / logout) work without — or with an
 * expired/missing — access token.
 *
 * Re-exported from AuthModule so every admin feature domain can import it
 * alongside `JwtAuthGuard` and `@CurrentUser()`.
 */
export const IS_PUBLIC_KEY = 'surong:isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
