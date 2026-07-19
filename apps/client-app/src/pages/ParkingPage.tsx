import type { ParkingSlotDto } from "@society-hub/types";
import { useAuth } from "../auth";
import { SimpleCrudPage } from "../components/SimpleCrudPage";

export function ParkingPage() {
  const { client } = useAuth();
  return (
    <SimpleCrudPage<ParkingSlotDto>
      title="Parking"
      description="Your registered vehicles and parking slot."
      testId="parking"
      emptyLabel="No vehicles registered yet."
      createLabel="Register vehicle"
      onList={() => client.listParkingSlots()}
      onCreate={(v) =>
        client.createParkingSlot({
          slotNumber: v.slotNumber,
          vehicleNumber: v.vehicleNumber || null,
          type: v.type || "car",
        })
      }
      fields={[
        { name: "vehicleNumber", label: "Vehicle number", required: true },
        { name: "type", label: "Type (car/bike)" },
        { name: "slotNumber", label: "Preferred slot", placeholder: "Optional" },
      ]}
      columns={[
        { key: "vehicle", label: "Vehicle", render: (r) => r.vehicleNumber ?? "—" },
        { key: "type", label: "Type", render: (r) => r.type },
        { key: "slot", label: "Slot", render: (r) => r.slotNumber },
      ]}
    />
  );
}
