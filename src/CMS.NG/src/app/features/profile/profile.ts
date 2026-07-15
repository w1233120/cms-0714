import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../core/auth/auth.service';

// The bilingual complexity policy — kept in sync with the backend's message.
export const PASSWORD_COMPLEXITY_MESSAGE =
  '密碼長度至少需 8 碼，且內容須至少包含四種字元的其中三種：大寫英文／小寫英文／數字／符號';

// Length >= 8 AND at least 3 of the 4 classes (upper / lower / digit / symbol). The
// `required` validator handles the empty case, so an empty value passes here.
function passwordComplexity(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) {
    return null;
  }
  const classes =
    (/[A-Z]/.test(value) ? 1 : 0) +
    (/[a-z]/.test(value) ? 1 : 0) +
    (/[0-9]/.test(value) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(value) ? 1 : 0);
  return value.length >= 8 && classes >= 3 ? null : { complexity: true };
}

// Group-level: new password and its confirmation must match. Only flags a mismatch once the
// confirmation has a value, so the error appears as the user types the confirmation.
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const newPassword = group.get('newPassword')?.value;
  const confirm = group.get('confirmNewPassword')?.value;
  return !confirm || newPassword === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  // UserId and roles are read straight from the stored profile — display-only, never editable.
  protected readonly auth = inject(AuthService);

  protected readonly complexityMessage = PASSWORD_COMPLEXITY_MESSAGE;

  readonly saving = signal(false);
  readonly savedMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    userName: [this.auth.userName(), [Validators.required]]
  });

  readonly changingPassword = signal(false);
  readonly passwordSavedMessage = signal<string | null>(null);
  readonly passwordErrorMessage = signal<string | null>(null);

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, passwordComplexity]],
      confirmNewPassword: ['', [Validators.required]]
    },
    { validators: passwordsMatch }
  );

  save(): void {
    const userName = this.form.controls.userName.value.trim();
    // Reflect the trimmed value back into the field so the user sees what will be saved.
    this.form.controls.userName.setValue(userName);

    if (this.form.invalid || !userName) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.savedMessage.set(null);
    this.errorMessage.set(null);

    this.auth.updateUserName(userName).subscribe({
      next: () => {
        this.saving.set(false);
        this.savedMessage.set('已儲存 Saved');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.errorMessage.set(err.status === 400 ? '請輸入名稱 Name is required' : '儲存失敗，請稍後再試');
      }
    });
  }

  changePassword(): void {
    this.passwordSavedMessage.set(null);
    this.passwordErrorMessage.set(null);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmNewPassword } = this.passwordForm.getRawValue();

    this.changingPassword.set(true);
    this.auth.changePassword(currentPassword, newPassword, confirmNewPassword).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordSavedMessage.set('密碼已更新 Password changed');
        this.passwordForm.reset();
      },
      error: (err: HttpErrorResponse) => {
        this.changingPassword.set(false);
        // The backend returns a bilingual message (wrong current password, complexity, mismatch).
        this.passwordErrorMessage.set(err.error?.message ?? '變更失敗，請稍後再試 Change failed, please try again');
      }
    });
  }
}
