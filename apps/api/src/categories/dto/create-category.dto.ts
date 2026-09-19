import {
  IsString,
  IsNotEmpty,
  MaxLength,
  // MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
