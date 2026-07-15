namespace CMS.API.Models;

public class FeaturedPromoItem
{
    public int Pkid { get; set; }
    public DateOnly ScheduleOn { get; set; }
    public short TrainingCenterPkid { get; set; }
    public byte Slot { get; set; }
    public int PromotionPkid { get; set; }
    // Joined from Promotion2 — the PromoCode the Promotion_pkid resolves to.
    public string PromoCode { get; set; } = default!;
    public string Topic { get; set; } = default!;
    public string Description { get; set; } = default!;
}
