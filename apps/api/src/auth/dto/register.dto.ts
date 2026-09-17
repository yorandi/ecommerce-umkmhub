import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { LoginDto } from './login.dto.js';

export class RegisterDto extends LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  name: string;
}
