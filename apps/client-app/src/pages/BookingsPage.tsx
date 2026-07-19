import type { BookingDto } from "@society-hub/types";
import { useAuth } from "../auth";
import { SimpleCrudPage } from "../components/SimpleCrudPage";

export function BookingsPage() {
  const { client } = useAuth();
  return (
    <SimpleCrudPage<BookingDto>
      title="Clubhouse bookings"
      description="Book the clubhouse or other shared facilities."
      testId="bookings"
      emptyLabel="No bookings yet."
      createLabel="New booking"
      onList={() => client.listBookings()}
      onCreate={(v) =>
        client.createBooking({
          facilityName: v.facilityName,
          startAt: v.startAt,
          endAt: v.endAt,
        })
      }
      fields={[
        { name: "facilityName", label: "Facility", required: true, placeholder: "Clubhouse hall" },
        { name: "startAt", label: "Start", type: "datetime-local", required: true },
        { name: "endAt", label: "End", type: "datetime-local", required: true },
      ]}
      columns={[
        { key: "facility", label: "Facility", render: (r) => r.facilityName },
        { key: "start", label: "Start", render: (r) => new Date(r.startAt).toLocaleString() },
        { key: "status", label: "Status", render: (r) => <span className="badge">{r.status}</span> },
      ]}
    />
  );
}
