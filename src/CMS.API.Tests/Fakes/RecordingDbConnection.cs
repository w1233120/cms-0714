using System.Collections;
using System.Data;
using System.Data.Common;
using System.Diagnostics.CodeAnalysis;

namespace CMS.API.Tests.Fakes;

// A minimal in-memory ADO.NET connection that lets a real Dapper repository run offline.
// It records every command's SQL and parameters (so a test can inspect the RowAudit INSERT
// the repository emits), returns programmed scalars for INSERT ... SCOPE_IDENTITY(), and
// serves programmed rows for SELECT loads from a queue of DataTables. It also tracks whether
// the surrounding transaction committed or rolled back.
//
// It derives from the System.Data.Common base classes (not just the IDbXxx interfaces) so
// Dapper's async execution path, which requires DbConnection/DbCommand, works unchanged.
public sealed class RecordingDbConnection : DbConnection
{
    private readonly Queue<DataTable> _readerResults = new();

    public List<RecordedCommand> Commands { get; } = [];
    public object? ScalarResult { get; set; }
    public int NonQueryResult { get; set; } = 1;
    public RecordingDbTransaction? Transaction { get; private set; }

    // Queue a result set to be returned by the next SELECT (ExecuteReader). Loads happen in
    // order: for an update the first row is the "before", the second the "after".
    public void EnqueueRows(DataTable table) => _readerResults.Enqueue(table);

    public DataTable NextReaderResult() =>
        _readerResults.Count > 0 ? _readerResults.Dequeue() : new DataTable();

    // Convenience: the commands that wrote to dbo.RowAudit.
    public IReadOnlyList<RecordedCommand> AuditInserts =>
        Commands.Where(c => c.Sql.Contains("INSERT INTO RowAudit")).ToList();

    private ConnectionState _state = ConnectionState.Closed;
    public override ConnectionState State => _state;
    public override void Open() => _state = ConnectionState.Open;
    public override void Close() => _state = ConnectionState.Closed;

    [AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => string.Empty;
    public override string DataSource => string.Empty;
    public override string ServerVersion => string.Empty;
    public override void ChangeDatabase(string databaseName) { }

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) =>
        Transaction = new RecordingDbTransaction(this, isolationLevel);

    protected override DbCommand CreateDbCommand() => new RecordingDbCommand(this);
}

public sealed record RecordedCommand(string Sql, IReadOnlyDictionary<string, object?> Parameters);

public sealed class RecordingDbTransaction(RecordingDbConnection connection, IsolationLevel isolationLevel) : DbTransaction
{
    public bool Committed { get; private set; }
    public bool RolledBack { get; private set; }

    protected override DbConnection DbConnection => connection;
    public override IsolationLevel IsolationLevel => isolationLevel;
    public override void Commit() => Committed = true;
    public override void Rollback() => RolledBack = true;
}

public sealed class RecordingDbCommand(RecordingDbConnection connection) : DbCommand
{
    private readonly RecordingParameterCollection _parameters = new();

    [AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; }
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get; set; } = connection;
    protected override DbTransaction? DbTransaction { get; set; }
    protected override DbParameterCollection DbParameterCollection => _parameters;

    public override void Cancel() { }
    public override void Prepare() { }
    protected override DbParameter CreateDbParameter() => new RecordingParameter();

    private void Record() => connection.Commands.Add(new RecordedCommand(CommandText, _parameters.Snapshot()));

    public override int ExecuteNonQuery()
    {
        Record();
        return connection.NonQueryResult;
    }

    public override object? ExecuteScalar()
    {
        Record();
        return connection.ScalarResult;
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
    {
        Record();
        return connection.NextReaderResult().CreateDataReader();
    }
}

public sealed class RecordingParameterCollection : DbParameterCollection
{
    private readonly List<DbParameter> _items = [];

    // Snapshot of parameter name → value as the command sees it at execution time.
    public IReadOnlyDictionary<string, object?> Snapshot() =>
        _items.ToDictionary(p => p.ParameterName, p => p.Value == DBNull.Value ? null : p.Value);

    public override int Count => _items.Count;
    public override object SyncRoot => _items;
    public override int Add(object value) { _items.Add((DbParameter)value); return _items.Count - 1; }
    public override void AddRange(Array values) { foreach (var v in values) Add(v); }
    public override void Clear() => _items.Clear();
    public override bool Contains(object value) => _items.Contains((DbParameter)value);
    public override bool Contains(string value) => _items.Any(p => p.ParameterName == value);
    public override void CopyTo(Array array, int index) => ((ICollection)_items).CopyTo(array, index);
    public override IEnumerator GetEnumerator() => _items.GetEnumerator();
    public override int IndexOf(object value) => _items.IndexOf((DbParameter)value);
    public override int IndexOf(string parameterName) => _items.FindIndex(p => p.ParameterName == parameterName);
    public override void Insert(int index, object value) => _items.Insert(index, (DbParameter)value);
    public override void Remove(object value) => _items.Remove((DbParameter)value);
    public override void RemoveAt(int index) => _items.RemoveAt(index);
    public override void RemoveAt(string parameterName) => _items.RemoveAt(IndexOf(parameterName));
    protected override DbParameter GetParameter(int index) => _items[index];
    protected override DbParameter GetParameter(string parameterName) => _items[IndexOf(parameterName)];
    protected override void SetParameter(int index, DbParameter value) => _items[index] = value;
    protected override void SetParameter(string parameterName, DbParameter value) => _items[IndexOf(parameterName)] = value;
}

public sealed class RecordingParameter : DbParameter
{
    public override DbType DbType { get; set; }
    public override ParameterDirection Direction { get; set; } = ParameterDirection.Input;
    public override bool IsNullable { get; set; }
    [AllowNull]
    public override string ParameterName { get; set; } = string.Empty;
    public override int Size { get; set; }
    [AllowNull]
    public override string SourceColumn { get; set; } = string.Empty;
    public override bool SourceColumnNullMapping { get; set; }
    public override DataRowVersion SourceVersion { get; set; }
    public override object? Value { get; set; }
    public override void ResetDbType() => DbType = DbType.Object;
}
