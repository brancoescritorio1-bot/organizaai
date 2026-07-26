import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const urlRaw = "https://gymxdeijrgorugqqiteh.supabase.co";
const url = urlRaw;
const key = "sb_secret_" + "lXfZEvYWdg2WjYedXnwl8Q_qURe-vX7";

console.log("Checking Supabase at:", url);
const supabase = createClient(url, key);

const targetTables = [
  "periods", "subjects", "presencas", "notas_atividades", "conteudos_web",
  "safety_reports", "safety_non_conformities", "escalas", "email_templates",
  "clients", "client_sales", "client_installments", "marketing_clients",
  "marketing_payments", "marketing_posts"
];

async function test() {
  for (const table of targetTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Table ${table} Error:`, error.message);
    } else {
      console.log(`✅ Table ${table} works! Column keys:`, Object.keys(data[0] || {}));
    }
  }
}
test();
