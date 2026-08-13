import {
    useEffect,
    useState,
  } from "react";
  
  import Screen from "@/components/ui/Screen";
  import BodyText from "@/components/ui/BodyText";
  import Metric from "@/components/ui/Metric";
  import SectionLabel from "@/components/ui/SectionLabel";
  
  import {
    getCurrentProfile,
    UserProfile,
  } from "@/lib/auth";
  
  export default function ProfileTestScreen() {
    const [profile, setProfile] =
      useState<UserProfile | null>(null);
  
    const [error, setError] =
      useState<string | null>(null);
  
    useEffect(() => {
      async function loadProfile() {
        try {
          const result =
            await getCurrentProfile();
  
          setProfile(result);
        } catch (error) {
          setError(
            JSON.stringify(
              error,
              null,
              2
            )
          );
        }
      }
  
      loadProfile();
    }, []);
  
    return (
      <Screen>
        <SectionLabel>
          PROFILTEST
        </SectionLabel>
  
        {error ? (
          <BodyText
            style={{
              marginTop: 12,
              fontSize: 13,
              lineHeight: 20,
            }}
          >
            Fel:
            {"\n"}
            {error}
          </BodyText>
        ) : profile ? (
          <>
            <Metric>
              {profile.name}
            </Metric>
  
            <BodyText>
              Roll: {profile.role}
            </BodyText>
  
            <BodyText>
              ID: {profile.id}
            </BodyText>
          </>
        ) : (
          <BodyText>
            Hämtar profil...
          </BodyText>
        )}
      </Screen>
    );
  }