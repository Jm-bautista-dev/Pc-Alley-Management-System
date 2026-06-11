"use client";

import ComingSoon from "@/components/ComingSoon";
import { FileText } from "lucide-react";

export default function PurchaseOrdersPage() {
  return (
    <ComingSoon 
      title="Purchase Orders" 
      description="Create, track, and manage official purchase orders sent to suppliers. This module is undergoing visual redesign for our Capstone project."
      Icon={FileText}
    />
  );
}
