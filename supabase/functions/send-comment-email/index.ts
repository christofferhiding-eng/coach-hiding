import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: {
    id: string;
    training_session_id: string;
    athlete_id: string;
    author_id: string;
    author_role: "athlete" | "coach";
    message: string;
    created_at: string;
    read_at: string | null;
  };
  old_record: Record<string, unknown> | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

Deno.serve(async (req) => {
  try {
    // --------------------------------------------------
    // 1. Läs webhook-payload
    // --------------------------------------------------

    const payload: WebhookPayload = await req.json();

    console.log(
      "WEBHOOK PAYLOAD:",
      JSON.stringify(payload)
    );

    if (payload.type !== "INSERT") {
      console.log(
        "Ignorerar event:",
        payload.type
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Ignorerar eventet.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const comment = payload.record;

    console.log(
      "COMMENT:",
      JSON.stringify(comment)
    );

    // --------------------------------------------------
    // 2. Bara kommentarer från adepter ska mejlas
    // --------------------------------------------------

    if (comment.author_role !== "athlete") {
      console.log(
        "Kommentar från coach. Inget mejl skickas."
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Kommentar från coach – inget mejl.",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // --------------------------------------------------
    // 3. Hämta secrets
    // --------------------------------------------------

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const resendApiKey =
      Deno.env.get("RESEND_API_KEY");

    const coachEmail =
      Deno.env.get("COACH_EMAIL");

    console.log(
      "ENV CHECK:",
      JSON.stringify({
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceRoleKey,
        hasResendApiKey: !!resendApiKey,
        hasCoachEmail: !!coachEmail,
      })
    );

    if (!supabaseUrl) {
      throw new Error(
        "SUPABASE_URL saknas."
      );
    }

    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY saknas."
      );
    }

    if (!resendApiKey) {
      throw new Error(
        "RESEND_API_KEY saknas."
      );
    }

    if (!coachEmail) {
      throw new Error(
        "COACH_EMAIL saknas."
      );
    }

    // --------------------------------------------------
    // 4. Supabase-klient
    // --------------------------------------------------

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // --------------------------------------------------
    // 5. Hämta adept + träningspass via SECURITY DEFINER RPC
    // --------------------------------------------------

    const {
      data: contextData,
      error: contextError,
    } = await supabase.rpc(
      "get_comment_email_context",
      {
        p_athlete_id:
          comment.athlete_id,

        p_training_session_id:
          comment.training_session_id,
      }
    );

    if (contextError) {
      throw new Error(
        `Kunde inte hämta mejlkontext: ${contextError.message}`
      );
    }

    console.log(
      "EMAIL CONTEXT:",
      JSON.stringify(contextData)
    );

    const athleteName =
      contextData?.athlete_name ||
      "Din adept";

    const sessionTitle =
      contextData?.session_title ||
      "Träningspass";

    // --------------------------------------------------
    // 6. Förbered innehåll
    // --------------------------------------------------

    const safeAthleteName =
      escapeHtml(athleteName);

    const safeSessionTitle =
      escapeHtml(sessionTitle);

    const safeMessage =
      escapeHtml(comment.message);

    // Direktlänk till adeptens sida + specifikt pass
    const athleteUrl =
      `https://coach-hiding.vercel.app/coach/athlete/${comment.athlete_id}?session=${comment.training_session_id}`;

    // --------------------------------------------------
    // 7. Skicka mejlet via Resend
    // --------------------------------------------------

    console.log(
      "SENDING EMAIL TO:",
      coachEmail
    );

    const emailResponse =
      await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${resendApiKey}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            from:
              "Coach Hiding <onboarding@resend.dev>",

            to: [coachEmail],

            subject:
              `Ny kommentar från ${athleteName}`,

            html: `
              <div style="
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                color: #111;
              ">

                <h2 style="
                  margin-bottom: 24px;
                ">
                  Ny kommentar från ${safeAthleteName}
                </h2>

                <p>
                  <strong>
                    ${safeAthleteName}
                  </strong>
                  har skrivit en kommentar på sitt
                  träningspass.
                </p>

                <div style="
                  background: #f5f5f5;
                  border-radius: 8px;
                  padding: 18px;
                  margin: 24px 0;
                ">

                  <p style="
                    margin-top: 0;
                    margin-bottom: 8px;
                    font-weight: 600;
                  ">
                    ${safeSessionTitle}
                  </p>

                  <p style="
                    margin: 0;
                    white-space: pre-wrap;
                    line-height: 1.5;
                  ">
                    "${safeMessage}"
                  </p>

                </div>

                <p>
                  <a
                    href="${athleteUrl}"
                    style="
                      display: inline-block;
                      padding: 12px 18px;
                      background: #111;
                      color: white;
                      text-decoration: none;
                      border-radius: 6px;
                      font-weight: 600;
                    "
                  >
                    Öppna träningspasset
                  </a>
                </p>

                <p style="
                  color: #777;
                  font-size: 13px;
                  margin-top: 30px;
                ">
                  Detta mejl skickades automatiskt
                  från Coach Hiding.
                </p>

              </div>
            `,
          }),
        }
      );

    const emailResult =
      await emailResponse.json();

    console.log(
      "RESEND RESPONSE:",
      emailResponse.status,
      JSON.stringify(emailResult)
    );

    if (!emailResponse.ok) {
      throw new Error(
        `Resend-fel: ${JSON.stringify(emailResult)}`
      );
    }

    console.log(
      "EMAIL SENT SUCCESSFULLY"
    );

    // --------------------------------------------------
    // 8. Klart
    // --------------------------------------------------

    return new Response(
      JSON.stringify({
        success: true,
        sent: true,
        resend: emailResult,
      }),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );

  } catch (error) {
    console.error(
      "send-comment-email ERROR:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Okänt fel",
      }),
      {
        status: 500,
        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});