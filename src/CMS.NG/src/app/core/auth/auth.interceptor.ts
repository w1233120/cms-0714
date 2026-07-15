import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { environment } from '@env';
import { AuthService } from './auth.service';

// Fallback shown when a 500-class response carries no safe message of its own.
const GENERIC_ERROR_DETAIL = '系統發生非預期錯誤，請稍後再試 An unexpected error occurred.';

// Attaches the stored bearer token to every outgoing API request and centralises HTTP error
// handling: a 401 clears the session and returns to login; a 500-class failure surfaces a
// friendly toast using the server's safe message. Everything else (validation/400, 403, 404)
// is re-thrown untouched so callers/forms handle it as before.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const messageService = inject(MessageService);

  const token = auth.token;
  const request =
    token && req.url.startsWith(environment.apiUrl)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.clearSession();
        router.navigate(['/login']);
      } else if (error.status >= 500) {
        // Only the safe { message } from the body is shown — never a raw stack trace/SQL.
        const detail =
          (typeof error.error?.message === 'string' && error.error.message) || GENERIC_ERROR_DETAIL;
        messageService.add({ severity: 'error', summary: '錯誤 Error', detail });
      }
      return throwError(() => error);
    })
  );
};
