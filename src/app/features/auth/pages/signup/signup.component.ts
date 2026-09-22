import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize, startWith } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Mirrors backend @ValidPassword:
 * - min 8 characters
 * - at least one uppercase letter
 * - at least one lowercase letter
 * - at least one digit
 * - at least one special character
 */
const passwordStrengthValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = (control.value as string) ?? '';
  const errors: ValidationErrors = {};

  if (value.length < 8) errors['minLength'] = true;
  if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
  if (!/[a-z]/.test(value)) errors['lowercase'] = true;
  if (!/\d/.test(value)) errors['digit'] = true;
  if (!/[^A-Za-z0-9]/.test(value)) errors['special'] = true;

  return Object.keys(errors).length ? { passwordStrength: errors } : null;
};

const passwordsMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordsMismatch: true } : null;
};

type PasswordRuleKey = 'minLength' | 'uppercase' | 'lowercase' | 'digit' | 'special';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly passwordFocused = signal(false);
  protected readonly resendLoading = signal(false);
  protected readonly resendCooldown = signal(0);

  protected readonly form = this.fb.nonNullable.group(
    {
      username: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(15)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  protected get username() {
    return this.form.controls.username;
  }
  protected get email() {
    return this.form.controls.email;
  }
  protected get password() {
    return this.form.controls.password;
  }
  protected get confirmPassword() {
    return this.form.controls.confirmPassword;
  }

  protected readonly passwordRules: ReadonlyArray<{ key: PasswordRuleKey; label: string }> = [
    { key: 'minLength', label: 'At least 8 characters' },
    { key: 'uppercase', label: 'One uppercase letter' },
    { key: 'lowercase', label: 'One lowercase letter' },
    { key: 'digit', label: 'One number' },
    { key: 'special', label: 'One special character' },
  ];

  /** Live password value as a signal so computed rules react to typing. */
  readonly passwordValue = toSignal(
    this.password.valueChanges.pipe(startWith(this.password.value)),
    { initialValue: '' },
  );

  /** Per-rule checklist derived from the live password value. */
  protected readonly passwordChecks = computed(() => {
    const v = this.passwordValue() ?? '';
    return {
      minLength: v.length >= 8,
      uppercase: /[A-Z]/.test(v),
      lowercase: /[a-z]/.test(v),
      digit: /\d/.test(v),
      special: /[^A-Za-z0-9]/.test(v),
    };
  });

  protected readonly passedRules = computed(
    () => Object.values(this.passwordChecks()).filter(Boolean).length,
  );

  protected readonly strengthPercent = computed(() => (this.passedRules() / 5) * 100);

  protected readonly strengthLabel = computed(() => {
    const n = this.passedRules();
    if (n <= 2) return 'Weak';
    if (n === 3) return 'Fair';
    if (n === 4) return 'Good';
    return 'Strong';
  });

  protected readonly strengthBarClass = computed(() => {
    const n = this.passedRules();
    if (n <= 2) return 'bg-red-500';
    if (n === 3) return 'bg-amber-500';
    if (n === 4) return 'bg-sky-500';
    return 'bg-emerald-500';
  });

  protected readonly strengthTextClass = computed(() => {
    const n = this.passedRules();
    if (n <= 2) return 'text-red-600';
    if (n === 3) return 'text-amber-600';
    if (n === 4) return 'text-sky-600';
    return 'text-emerald-600';
  });

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }
  protected toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }
  protected onPasswordFocus(): void {
    this.passwordFocused.set(true);
  }
  protected onPasswordBlur(): void {
    this.passwordFocused.set(false);
    this.password.markAsTouched();
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, email, password } = this.form.getRawValue();

    this.auth
      .register({ username, email, password })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Account created. We sent a verification link to your email.');
          this.startResendCooldown();
        },
        error: (err: { error?: { message?: string } }) => {
          this.errorMessage.set(
            err?.error?.message ?? 'Could not create your account. Please try again.',
          );
        },
      });
  }

  protected onResend(): void {
    if (this.resendLoading() || this.resendCooldown() > 0) return;

    const email = this.form.controls.email.value;
    if (!email) return;

    this.resendLoading.set(true);

    // Add a resendVerification(email) method to AuthService if you want a
    // dedicated endpoint. For now, reusing register is fine if idempotent
    // on the backend — otherwise add POST /api/v1/auth/resend-verification.
    this.auth
      .resendVerification(email)
      .pipe(finalize(() => this.resendLoading.set(false)))
      .subscribe({
        next: () => this.startResendCooldown(),
        error: () => this.startResendCooldown(),
      });
  }

  private startResendCooldown(): void {
    this.resendCooldown.set(60);
    const id = setInterval(() => {
      const next = this.resendCooldown() - 1;
      this.resendCooldown.set(next);
      if (next <= 0) clearInterval(id);
    }, 1000);
  }
}
