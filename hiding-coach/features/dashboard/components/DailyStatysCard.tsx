import React from "react";

import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Metric from "@/components/ui/Metric";
import ProgressBar from "@/components/ui/ProgressBar";
import SectionLabel from "@/components/ui/SectionLabel";

type DailyStatusCardProps = {
  title: string;
  score: number;
  message: string;
};

export default function DailyStatusCard({
  title,
  score,
  message,
}: DailyStatusCardProps) {
  return (
    <Card>
      <SectionLabel>
        ⚡ Dagens status
      </SectionLabel>

      <Metric>
        {title}
      </Metric>

      <ProgressBar value={score * 10} />

      <BodyText>
        {message}
      </BodyText>
    </Card>
  );
}