
import { Header } from "@/components/Header/Header";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { EntitlementGrid } from "@/components/EntitlementGrid/EntitlementGrid";

const sampleEntitlements = [
  {
    entitlementID: "12345",
    sku: "SKU-001",
    product_type: "Software",
    start_date: "2023-01-01T00:00:00Z",
    end_date: "2024-01-01T00:00:00Z",
    quantity: 10,
    status: 'fulfilled'
  },
  {
    entitlementID: "67890",
    sku: "SKU-002",
    product_type: "Service",
    start_date: "2023-06-15T00:00:00Z",
    end_date: "2024-06-15T00:00:00Z",
    quantity: 5,
    status: 'pending'
  }

];

export default function Home() {
  return (
    <>
      <Header />
      <SearchBar />
      <EntitlementGrid entitlements={sampleEntitlements} />
    </>
  );
}
