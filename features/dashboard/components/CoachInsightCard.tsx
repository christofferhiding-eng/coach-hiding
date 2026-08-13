import React from "react";

import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Heading from "@/components/ui/Heading";
import SectionLabel from "@/components/ui/SectionLabel";

type CoachInsightCardProps = {
  title: string;
  message: string;
};

export default function CoachInsightCard({
  title,
  message,
}: CoachInsightCardProps) {
  return (
    <Card>
      <SectionLabel>
        🤖 {title}
      </SectionLabel>

      <Heading>
        Idag tränar vi tålamod.
      </Heading>

      <BodyText>
        {message}
      </BodyText>
    </Card>
  );
}