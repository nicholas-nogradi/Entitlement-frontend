
import { Header } from "@/components/Header/Header";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { EntitlementGrid } from "@/components/EntitlementGrid/EntitlementGrid";
import mockEntitlements from "./mockEntitlement";
import { useState } from "react";


export default function Home() {
  const [isLoading, setIsLoading] = useState(false);

  // const handleClick = () => {
  //   setIsLoading(true);
  //   // Simulate a network request or some async operation
  //   setTimeout(() => {
  //     setIsLoading(false);
  //   }, 2000);
  // }

  return (
    
      <div >
        <Header />
        <SearchBar />
        <EntitlementGrid entitlements={mockEntitlements} isLoading={isLoading}/>
      </div>
    
  );
}
