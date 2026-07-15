namespace CMS.API.Models;

public class Course
{
    public int Pkid { get; set; }
    public string Title { get; set; } = default!;
    public string? OfficialTitle { get; set; }
    public string CourseId { get; set; } = default!;
    public string ProdCourseId { get; set; } = default!;
    public string FriendlyUrl { get; set; } = default!;
    public int DisplayOrder { get; set; }
    public short PartnerPkid { get; set; }
    public short? CourseGroupPkid { get; set; }
    public byte PublishStatusPkid { get; set; }
    public DateOnly ScheduleOn { get; set; }
    public DateOnly ScheduleOff { get; set; }
    public short Hour { get; set; }
    public decimal ListPrice { get; set; }
    public decimal LearningCredit { get; set; }
    public string? Material { get; set; }
    public string? Objective { get; set; }
    public string? Target { get; set; }
    public string? Prerequisites { get; set; }
    public string? Outline { get; set; }
    public string? TowardCertOrExam { get; set; }
    public string? Note { get; set; }
    public string? OtherInfo { get; set; }
    public bool CanRepeat { get; set; }

    // Joined FK labels for the list/detail (not written back).
    public string PartnerName { get; set; } = default!;
    public string? CourseGroupDescription { get; set; }
    public string PublishStatusDescription { get; set; } = default!;
}
