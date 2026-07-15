using CMS.API.Data;
using CMS.API.Models;
using Dapper;

namespace CMS.API.Repositories;

public class CourseRepository(IDbConnectionFactory connectionFactory) : ICourseRepository
{
    // FK labels are joined in (LEFT JOIN for the nullable CourseGroup) so the list can show
    // partner/course-group/publish-status names instead of raw pkids.
    private const string SelectColumns = """
        SELECT c.pkid, c.Title, c.OfficialTitle, c.CourseId, c.ProdCourseId, c.FriendlyUrl,
               c.DisplayOrder, c.Partner_pkid AS PartnerPkid, c.CourseGroup_pkid AS CourseGroupPkid,
               c.PublishStatus_pkid AS PublishStatusPkid, c.ScheduleOn, c.ScheduleOff, c.Hour,
               c.ListPrice, c.LearningCredit, c.Material, c.Objective, c.Target, c.Prerequisites,
               c.Outline, c.TowardCertOrExam, c.Note, c.OtherInfo, c.CanRepeat,
               p.Name AS PartnerName, g.Description AS CourseGroupDescription,
               s.Description AS PublishStatusDescription
        FROM Course c
        INNER JOIN Partner p ON p.pkid = c.Partner_pkid
        LEFT JOIN CourseGroup g ON g.pkid = c.CourseGroup_pkid
        INNER JOIN PublishStatus s ON s.pkid = c.PublishStatus_pkid
        """;

    private const string OrderBy = " ORDER BY c.DisplayOrder ASC, c.pkid DESC";

    public async Task<IEnumerable<Course>> GetAllAsync()
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<Course>($"{SelectColumns}{OrderBy}");
    }

    public async Task<IEnumerable<Course>> QueryAsync(CourseQuery query)
    {
        var conditions = new List<string>();
        var parameters = new DynamicParameters();

        if (!string.IsNullOrWhiteSpace(query.Keyword))
        {
            conditions.Add("""
                (c.Title LIKE @Keyword OR c.OfficialTitle LIKE @Keyword OR c.CourseId LIKE @Keyword
                 OR c.ProdCourseId LIKE @Keyword OR c.FriendlyUrl LIKE @Keyword)
                """);
            parameters.Add("Keyword", $"%{query.Keyword}%");
        }

        if (query.PartnerPkid.HasValue)
        {
            conditions.Add("c.Partner_pkid = @PartnerPkid");
            parameters.Add("PartnerPkid", query.PartnerPkid.Value);
        }

        if (query.CourseGroupPkid.HasValue)
        {
            conditions.Add("c.CourseGroup_pkid = @CourseGroupPkid");
            parameters.Add("CourseGroupPkid", query.CourseGroupPkid.Value);
        }

        if (query.PublishStatusPkid.HasValue)
        {
            conditions.Add("c.PublishStatus_pkid = @PublishStatusPkid");
            parameters.Add("PublishStatusPkid", query.PublishStatusPkid.Value);
        }

        if (query.ScheduleOnFrom.HasValue)
        {
            conditions.Add("c.ScheduleOn >= @ScheduleOnFrom");
            parameters.Add("ScheduleOnFrom", query.ScheduleOnFrom.Value);
        }

        if (query.ScheduleOnTo.HasValue)
        {
            conditions.Add("c.ScheduleOn <= @ScheduleOnTo");
            parameters.Add("ScheduleOnTo", query.ScheduleOnTo.Value);
        }

        if (query.ScheduleOffFrom.HasValue)
        {
            conditions.Add("c.ScheduleOff >= @ScheduleOffFrom");
            parameters.Add("ScheduleOffFrom", query.ScheduleOffFrom.Value);
        }

        if (query.ScheduleOffTo.HasValue)
        {
            conditions.Add("c.ScheduleOff <= @ScheduleOffTo");
            parameters.Add("ScheduleOffTo", query.ScheduleOffTo.Value);
        }

        if (query.CanRepeat.HasValue)
        {
            conditions.Add("c.CanRepeat = @CanRepeat");
            parameters.Add("CanRepeat", query.CanRepeat.Value);
        }

        var whereClause = conditions.Count > 0 ? $" WHERE {string.Join(" AND ", conditions)}" : "";
        var sql = $"{SelectColumns}{whereClause}{OrderBy}";

        using var connection = connectionFactory.CreateConnection();
        return await connection.QueryAsync<Course>(sql, parameters);
    }

    public async Task<Course?> GetByIdAsync(int pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        return await connection.QuerySingleOrDefaultAsync<Course>(
            $"{SelectColumns} WHERE c.pkid = @Pkid", new { Pkid = pkid });
    }

    public async Task<int> CreateAsync(CourseRequest request)
    {
        using var connection = connectionFactory.CreateConnection();

        return await connection.ExecuteScalarAsync<int>("""
            INSERT INTO Course (Title, OfficialTitle, CourseId, ProdCourseId, FriendlyUrl, DisplayOrder,
                Partner_pkid, CourseGroup_pkid, PublishStatus_pkid, ScheduleOn, ScheduleOff, Hour,
                ListPrice, LearningCredit, Material, Objective, Target, Prerequisites, Outline,
                TowardCertOrExam, Note, OtherInfo, CanRepeat)
            VALUES (@Title, @OfficialTitle, @CourseId, @ProdCourseId, @FriendlyUrl, @DisplayOrder,
                @PartnerPkid, @CourseGroupPkid, @PublishStatusPkid, @ScheduleOn, @ScheduleOff, @Hour,
                @ListPrice, @LearningCredit, @Material, @Objective, @Target, @Prerequisites, @Outline,
                @TowardCertOrExam, @Note, @OtherInfo, @CanRepeat);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """, request);
    }

    public async Task<bool> UpdateAsync(CourseRequest request)
    {
        using var connection = connectionFactory.CreateConnection();

        var rowsAffected = await connection.ExecuteAsync("""
            UPDATE Course
            SET Title = @Title, OfficialTitle = @OfficialTitle, CourseId = @CourseId,
                ProdCourseId = @ProdCourseId, FriendlyUrl = @FriendlyUrl, DisplayOrder = @DisplayOrder,
                Partner_pkid = @PartnerPkid, CourseGroup_pkid = @CourseGroupPkid,
                PublishStatus_pkid = @PublishStatusPkid, ScheduleOn = @ScheduleOn, ScheduleOff = @ScheduleOff,
                Hour = @Hour, ListPrice = @ListPrice, LearningCredit = @LearningCredit, Material = @Material,
                Objective = @Objective, Target = @Target, Prerequisites = @Prerequisites, Outline = @Outline,
                TowardCertOrExam = @TowardCertOrExam, Note = @Note, OtherInfo = @OtherInfo, CanRepeat = @CanRepeat
            WHERE pkid = @Pkid
            """, request);

        return rowsAffected > 0;
    }

    public async Task<bool> DeleteAsync(int pkid)
    {
        using var connection = connectionFactory.CreateConnection();
        var rowsAffected = await connection.ExecuteAsync(
            "DELETE FROM Course WHERE pkid = @Pkid", new { Pkid = pkid });

        return rowsAffected > 0;
    }
}
