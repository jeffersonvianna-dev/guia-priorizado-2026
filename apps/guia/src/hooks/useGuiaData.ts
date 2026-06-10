import { useEffect, useState } from 'react'
import { fetchAll } from '../supabase'
import {
  type EscopoAFRow, type EscopoEMRow, type EscopoRow, type AeDetalhesRow, type MatrizDescritoresRow, type MdTarefaRow,
} from '../types'

export interface GuiaData {
  escopoAF: EscopoRow[]
  escopoEM: EscopoRow[]
  aeAF: AeDetalhesRow[]
  aeEM: AeDetalhesRow[]
  matrizAF: MatrizDescritoresRow[]
  matrizEM: MatrizDescritoresRow[]
  mdTarefas: MdTarefaRow[]
  habBncc: Record<string, string>   // código de habilidade -> texto BNCC/Currículo Paulista
  loading: boolean
  error: string | null
}

interface HabBnccRow { codigo: string; texto: string | null }

function mapAF(r: EscopoAFRow): EscopoRow {
  return { ...r, serie: r.ano, aula: Number(r.aula), segmento: 'AF' }
}
function mapEM(r: EscopoEMRow): EscopoRow {
  return { ...r, aula: Number(r.aula), segmento: 'EM' }
}

export function useGuiaData(): GuiaData {
  const [state, setState] = useState<GuiaData>({
    escopoAF: [], escopoEM: [], aeAF: [], aeEM: [],
    matrizAF: [], matrizEM: [], mdTarefas: [], habBncc: {}, loading: true, error: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [rawAF, rawEM, aeAF, aeEM, matrizAF, matrizEM, mdTarefas, habBnccRows] = await Promise.all([
          fetchAll<EscopoAFRow>('escopo_af'),
          fetchAll<EscopoEMRow>('escopo_em'),
          fetchAll<AeDetalhesRow>('ae_detalhes_af'),
          fetchAll<AeDetalhesRow>('ae_detalhes_em'),
          fetchAll<MatrizDescritoresRow>('matriz_descritores_af'),
          fetchAll<MatrizDescritoresRow>('matriz_descritores_em'),
          fetchAll<MdTarefaRow>('md_tarefas'),
          fetchAll<HabBnccRow>('habilidades_bncc'),
        ])
        const habBncc: Record<string, string> = {}
        for (const r of habBnccRows) {
          if (r.codigo && r.texto) habBncc[r.codigo] = r.texto
        }
        if (!cancelled) setState({
          escopoAF: rawAF.map(mapAF),
          escopoEM: rawEM.map(mapEM),
          aeAF, aeEM, matrizAF, matrizEM, mdTarefas, habBncc,
          loading: false, error: null,
        })
      } catch (e: unknown) {
        if (!cancelled) setState(s => ({
          ...s, loading: false,
          error: e instanceof Error ? e.message : 'Erro ao carregar dados',
        }))
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return state
}
