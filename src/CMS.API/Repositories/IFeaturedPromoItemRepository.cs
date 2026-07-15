using CMS.API.Models;

namespace CMS.API.Repositories;

public interface IFeaturedPromoItemRepository
{
    Task<IEnumerable<FeaturedPromoItem>> GetAllAsync();
    Task<IEnumerable<FeaturedPromoItem>> QueryAsync(FeaturedPromoItemQuery query);
    Task<FeaturedPromoItem?> GetByIdAsync(int pkid);
    Task<bool> ExistsAsync(DateOnly scheduleOn, short trainingCenterPkid, byte slot);
    Task<int> CreateAsync(FeaturedPromoItemRequest request);
    Task<bool> UpdateAsync(FeaturedPromoItemRequest request);
    Task<bool> SwapSlotsAsync(int pkidA, int pkidB);
    Task<bool> DeleteAsync(int pkid);
}
