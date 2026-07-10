import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * SPEC §4.3 — `@CurrentUser()` param decorator.
 *
 * Resolves to `req.user.id` (the JWT `sub` placed there by `JwtStrategy`'s
 * verifier). Handlers receive the authenticated userId as a plain parameter:
 *
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   me(@CurrentUser() userId: string) { ... }
 *
 * The guard guarantees `req.user` is populated before the handler runs.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{
      user?: { id?: string };
    }>();
    return request.user?.id;
  },
);
