import { IsByteLength, IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @IsByteLength(0, 72, { message: 'password must not exceed 72 UTF-8 bytes' })
  password: string;
}
