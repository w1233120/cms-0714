namespace CMS.API.Models;

public class FeaturedPromoItemRequest
{
    // pkid is int IDENTITY — the DB supplies it on create. Kept here because PUT reads the key from the body.
    public int Pkid { get; set; }
    public DateOnly ScheduleOn { get; set; }
    public short TrainingCenterPkid { get; set; }
    public byte Slot { get; set; }
    public int PromotionPkid { get; set; }
    public string Topic { get; set; } = default!;
    public string Description { get; set; } = default!;
}
