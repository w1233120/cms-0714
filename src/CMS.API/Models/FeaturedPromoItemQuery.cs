namespace CMS.API.Models;

public class FeaturedPromoItemQuery
{
    public short? TrainingCenterPkid { get; set; }
    // One-week window (Monday–Sunday), filtered inclusively on ScheduleOn.
    public DateOnly? ScheduleOnFrom { get; set; }
    public DateOnly? ScheduleOnTo { get; set; }
}
