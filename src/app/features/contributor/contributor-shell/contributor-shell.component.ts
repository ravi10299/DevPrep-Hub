import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-contributor-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './contributor-shell.component.html',
  styleUrl: './contributor-shell.component.css',
})
export class ContributorShellComponent {
  protected auth = inject(AuthService);
}
