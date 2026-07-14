namespace CMS.API.Models;

public class Partner
{
    public short Pkid { get; set; }
    public string Name { get; set; } = default!;
    public string AppKey { get; set; } = default!;
    public string NameOnPartnerMenu { get; set; } = default!;
    public string NameOnCourseDetailPage { get; set; } = default!;
    public int DisplayOrder { get; set; }
    public string? ImageFilename { get; set; }
}
