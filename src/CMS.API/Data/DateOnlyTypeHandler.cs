using System.Data;
using Dapper;

namespace CMS.API.Data;

// SqlClient has no native DateOnly mapping; bridge through DbType.Date <-> DateTime.
// Registering the handler for DateOnly also covers DateOnly? (Dapper adds the nullable variant).
public class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
{
    public override void SetValue(IDbDataParameter parameter, DateOnly value)
    {
        parameter.DbType = DbType.Date;
        parameter.Value = value.ToDateTime(TimeOnly.MinValue);
    }

    public override DateOnly Parse(object value) => DateOnly.FromDateTime((DateTime)value);
}
