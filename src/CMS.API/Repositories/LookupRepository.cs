using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class LookupRepository(IDbConnectionFactory connectionFactory) : ILookupRepository
{
    public async Task<IEnumerable<AppUserLookup>> GetAppUsersAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppUserLookup>(
            "SELECT UserId, UserName FROM AppUser ORDER BY UserName ASC");
    }

    public async Task<IEnumerable<AppRoleLookup>> GetAppRolesAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<AppRoleLookup>(
            "SELECT RoleId, RoleName FROM AppRole ORDER BY RoleName ASC");
    }

    public async Task<IEnumerable<PublishStatusLookup>> GetPublishStatusesAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<PublishStatusLookup>(
            "SELECT pkid, Description FROM PublishStatus ORDER BY pkid ASC");
    }

    public async Task<IEnumerable<PartnerLookup>> GetPartnersAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<PartnerLookup>(
            "SELECT pkid, Name FROM Partner ORDER BY DisplayOrder ASC");
    }

    public async Task<IEnumerable<CourseGroupLookup>> GetCourseGroupsAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<CourseGroupLookup>(
            "SELECT pkid, Description FROM CourseGroup ORDER BY pkid ASC");
    }

    public async Task<IEnumerable<TrainingCenterLookup>> GetTrainingCentersAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<TrainingCenterLookup>(
            "SELECT pkid, Name FROM TrainingCenter ORDER BY DisplayOrder ASC");
    }

    public async Task<IEnumerable<PromotionLookup>> GetPromotionsAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<PromotionLookup>(
            "SELECT pkid, PromoCode, Topic, Description FROM Promotion2 ORDER BY PromoCode ASC");
    }
}
