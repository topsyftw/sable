export async function joinAlphaWaitlist(email, source = "site") {
  const URL = "https://cbabwpvvwerumifvbema.supabase.co";
  const KEY = "sb_publishable_m7B1dfuXOznfW40swEe-xg_Q6Zqc643"; // publishable anon key, safe to ship
  const endpoint = URL + "/rest/v1/rpc/join_alpha_waitlist";
  const body = JSON.stringify({ p_email: email, p_source: source });

  let r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: KEY,
      Authorization: "Bearer " + KEY,
    },
    body,
  });

  // Some gateways reject the Bearer header. The publishable key in apikey is enough.
  if (r.status === 401) {
    r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: KEY,
      },
      body,
    });
  }

  if (!r.ok) throw new Error("network_" + r.status);
  return await r.json(); // {ok:true} | {ok:false, error:'invalid_email'|'full'}
}
