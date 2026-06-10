import { useEffect, useState } from 'react'
import { fetchAll } from '../supabase'
import {
  type EscopoRow, type AeDetalhesRow, type MatrizDescritoresRow, type MdTarefaRow,
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

/* ──────────────────────────────────────────────────────────────────────────
 * Schema unificado 2026: tabelas únicas (escopo, ae_detalhes, matriz_descritores)
 * com `segmento` ('AF'|'EM') e `bimestre` smallint 1–4.
 * Este hook lê das unificadas, converte bimestre→texto e divide por segmento,
 * mantendo o shape que os componentes já consomem (nada muda abaixo daqui).
 * ────────────────────────────────────────────────────────────────────────── */

const BIM_TEXT: Record<number, string> = {
  1: '1º Bimestre', 2: '2º Bimestre', 3: '3º Bimestre', 4: '4º Bimestre',
}
function bimText(b: number | null): string {
  return b == null ? '' : (BIM_TEXT[b] ?? String(b))
}

interface EscopoUni {
  id: number; segmento: 'AF' | 'EM'; serie: string; componente: string
  bimestre: number; aula: string | number; titulo: string
  conteudo: string | null; objetivos: string | null; habilidades: string
  aprendizagem_essencial: string | null; unidade_tematica: string | null; id_md: string | null
}
interface AeUni {
  id: number; segmento: 'AF' | 'EM'; serie: string; componente: string
  bimestre: number | null; ae: string; titulo: string
  hab_priorizada: string; hab_relacionadas: string | null; conhecimentos_previos: string | null
}
interface MatrizUni {
  id: number; segmento: 'AF' | 'EM'; serie: string; componente: string
  ae: string; bimestre: number | null; grupo: string; descritor: string
}
interface HabRow { codigo: string; texto: string | null }

function toEscopo(r: EscopoUni): EscopoRow {
  return {
    id: r.id, componente: r.componente, serie: r.serie,
    bimestre: bimText(r.bimestre), aula: Number(r.aula), titulo: r.titulo,
    conteudo: r.conteudo, objetivos: r.objetivos, habilidades: r.habilidades,
    aprendizagem_essencial: r.aprendizagem_essencial, unidade_tematica: r.unidade_tematica,
    id_md: r.id_md, segmento: r.segmento,
  }
}
function toAe(r: AeUni): AeDetalhesRow {
  return {
    id: r.id, segmento: r.segmento, serie: r.serie, componente: r.componente,
    bimestre: bimText(r.bimestre), ae: r.ae, titulo: r.titulo,
    hab_priorizada: r.hab_priorizada, hab_relacionadas: r.hab_relacionadas,
    conhecimentos_previos: r.conhecimentos_previos,
  }
}
function toMatriz(r: MatrizUni): MatrizDescritoresRow {
  return {
    id: r.id, serie: r.serie, componente: r.componente, ae: r.ae,
    bimestre: bimText(r.bimestre), grupo: r.grupo, descritor: r.descritor,
  }
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
        const [escopo, ae, matriz, mdTarefas, habRows] = await Promise.all([
          fetchAll<EscopoUni>('escopo'),
          fetchAll<AeUni>('ae_detalhes'),
          fetchAll<MatrizUni>('matriz_descritores'),
          fetchAll<MdTarefaRow>('md_tarefas'),
          fetchAll<HabRow>('habilidades'),
        ])
        const habBncc: Record<string, string> = {}
        for (const r of habRows) {
          if (r.codigo && r.texto && !habBncc[r.codigo]) habBncc[r.codigo] = r.texto
        }
        if (!cancelled) setState({
          escopoAF: escopo.filter(r => r.segmento === 'AF').map(toEscopo),
          escopoEM: escopo.filter(r => r.segmento === 'EM').map(toEscopo),
          aeAF: ae.filter(r => r.segmento === 'AF').map(toAe),
          aeEM: ae.filter(r => r.segmento === 'EM').map(toAe),
          matrizAF: matriz.filter(r => r.segmento === 'AF').map(toMatriz),
          matrizEM: matriz.filter(r => r.segmento === 'EM').map(toMatriz),
          mdTarefas, habBncc,
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
