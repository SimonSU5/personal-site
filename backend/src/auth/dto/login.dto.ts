import {
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * SPEC §4.3 — LoginDto.
 *
 * `{ identifier: 1..255, password: 1..256 }` with whitelist + forbidNonWhitelisted
 * (enforced by the global ValidationPipe). `identifier` is login-agnostic
 * (username today); the field is named `identifier` so future email login does
 * not change the wire contract.
 */
export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

/** Public projection of a user (NEVER includes passwordHash). */
export interface UserPublicDto {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface LoginResponseDto {
  accessToken: string;
  user: UserPublicDto;
  expiresIn: number;
  /** Raw refresh cookie value — set by the controller as the refresh_token
   * cookie; NEVER serialized into the JSON response body. */
  refreshToken: string;
}

export interface RefreshResponseDto {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}
