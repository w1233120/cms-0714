namespace CMS.API.Models;

// Slim view of Promotion2 for the PromoCode lookup on the FeaturedPromoItem form:
// the user types a PromoCode, and the match resolves to Promotion_pkid (plus a Topic/
// Description default lifted from the promotion).
public class PromotionLookup
{
    public int Pkid { get; set; }
    public string PromoCode { get; set; } = default!;
    public string Topic { get; set; } = default!;
    public string Description { get; set; } = default!;
}
