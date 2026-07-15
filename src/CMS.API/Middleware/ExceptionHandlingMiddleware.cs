namespace CMS.API.Middleware;

// Outermost pipeline middleware: catches any unhandled exception thrown by a controller or
// repository, logs the full detail (message + stack trace) server-side, and returns ONE
// consistent, safe 500 JSON body — never the stack trace, SQL text, or connection details.
//
// It only reacts to *exceptions*. Meaningful responses that don't throw — 401 (unauthenticated),
// 403 (forbidden), and validation/400 — never enter the catch, so they flow through unchanged.
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    // The single generic message the client ever sees for an unexpected failure.
    public const string GenericMessage = "An unexpected error occurred.";

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            // Full detail stays server-side in the log only.
            logger.LogError(ex, "Unhandled exception processing {Method} {Path}",
                context.Request.Method, context.Request.Path);

            if (context.Response.HasStarted)
            {
                // The response is already on the wire; we can't safely rewrite it. Let it surface.
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { message = GenericMessage });
        }
    }
}
