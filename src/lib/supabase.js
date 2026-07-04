import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// PostgREST/Supabase devuelve como máximo 1000 filas por consulta.
// Este helper trae TODAS las filas de una tabla/consulta paginando con .range().
// Úsalo siempre que una tabla pueda superar las 1000 filas (evaluaciones,
// coevaluaciones, participantes, etc.) para no subcontar datos.
export async function fetchAllRows(table, select) {
  const pageSize = 1000;
  const todo = [];
  let desde = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(desde, desde + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    todo.push(...data);
    if (data.length < pageSize) break;
    desde += pageSize;
  }
  return todo;
}
