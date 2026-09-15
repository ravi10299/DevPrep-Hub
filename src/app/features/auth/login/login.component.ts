import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  email = signal('');
  password = signal('');
  loading = signal(false);
  error = signal('');

  async onSubmit(): Promise<void> {
    this.error.set('');
    this.loading.set(true);

    try {
      const user = await this.auth.login({
        email: this.email(),
        password: this.password(),
      });

      this.toast.success(`Welcome, ${user.name}!`);

      if (user.role === 'ADMIN') {
        this.router.navigate(['/admin']);
      } else if (user.role === 'CONTRIBUTOR') {
        this.router.navigate(['/contributor']);
      } else {
        this.router.navigate(['/']);
      }
    } catch {
      this.error.set('Invalid email or password.');
    } finally {
      this.loading.set(false);
    }
  }
}
