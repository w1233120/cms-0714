namespace CMS.API.Models;

public class PublishStatusRequest
{
    // pkid is a plain tinyint, not IDENTITY — the caller supplies it on create.
    public byte Pkid { get; set; }
    public string Description { get; set; } = default!;
    public bool IsDraft { get; set; }
    public bool IsPublished { get; set; }
    public bool IsDiscontinued { get; set; }
}
