namespace CMS.API.Models;

// Moves a slot up/down by swapping the Slot values of two items, honouring the
// UNIQUE (ScheduleOn, TrainingCenter_pkid, Slot) constraint via a single transaction.
public class SwapSlotsRequest
{
    public int PkidA { get; set; }
    public int PkidB { get; set; }
}
