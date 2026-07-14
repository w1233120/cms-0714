namespace CMS.API.Models;

public class CourseGroupRequest
{
    // pkid is smallint IDENTITY — the DB supplies it on create. Kept here because PUT reads the key from the body.
    public short Pkid { get; set; }
    public string Description { get; set; } = default!;
}
