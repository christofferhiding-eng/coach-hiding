import React from "react";

import BodyText from "@/components/ui/BodyText";
import Card from "@/components/ui/Card";
import Heading from "@/components/ui/Heading";
import SectionLabel from "@/components/ui/SectionLabel";

type WelcomeCardProps = {
  greeting: string;
  firstName: string;
};

export default function WelcomeCard({
  greeting,
  firstName,
}: WelcomeCardProps) {
  return (
    <Card>
      <SectionLabel>
        👋 {greeting}
      </SectionLabel>

      <Heading>
        {firstName}
      </Heading>

      <BodyText>
        Välkommen tillbaka till Coach Hiding.
      </BodyText>
    </Card>
  );
}