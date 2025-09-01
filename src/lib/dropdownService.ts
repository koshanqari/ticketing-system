import { supabase, isSupabaseAvailable } from './supabase'
import { DropdownOption } from '@/types'

export class DropdownService {
  // Get all dropdown options for a specific type
  async getDropdownOptions(type: string): Promise<DropdownOption[]> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('ticket_dropdown')
        .select('*')
        .eq('dropdown_type', type)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('value', { ascending: true }) // Fallback to alphabetical if sort_order is same

      if (error) {
        throw new Error(`Failed to fetch dropdown options: ${error.message}`)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch dropdown options: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get all dropdown options grouped by type
  async getAllDropdownOptions(): Promise<Record<string, DropdownOption[]>> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('ticket_dropdown')
        .select('*')
        .eq('is_active', true)
        .order('dropdown_type')
        .order('sort_order', { ascending: true })
        .order('value', { ascending: true }) // Fallback to alphabetical if sort_order is same

      if (error) {
        throw new Error(`Failed to fetch dropdown options: ${error.message}`)
      }

      // Group by dropdown_type
      const grouped: Record<string, DropdownOption[]> = {}
      data?.forEach(option => {
        if (!grouped[option.dropdown_type]) {
          grouped[option.dropdown_type] = []
        }
        grouped[option.dropdown_type].push(option)
      })

      return grouped
    } catch (error) {
      throw new Error(`Failed to fetch dropdown options: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Add new dropdown option
  async addDropdownOption(option: Omit<DropdownOption, 'id' | 'created_at'>): Promise<DropdownOption> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('ticket_dropdown')
        .insert(option)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to add dropdown option: ${error.message}`)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to add dropdown option: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update dropdown option
  async updateDropdownOption(id: string, updates: Partial<DropdownOption>): Promise<DropdownOption> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('ticket_dropdown')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update dropdown option: ${error.message}`)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to update dropdown option: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Soft delete dropdown option
  async deactivateDropdownOption(id: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('ticket_dropdown')
        .update({ is_active: false })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to deactivate dropdown option: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to deactivate dropdown option: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get L2 issue types for a specific L1 type
  async getIssueTypeL2Options(l1Type: string): Promise<DropdownOption[]> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('ticket_dropdown')
        .select('*')
        .eq('dropdown_type', 'issue_type_l2')
        .eq('is_active', true)
        .order('value')

      if (error) {
        throw new Error(`Failed to fetch L2 options: ${error.message}`)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch L2 options: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const dropdownService = new DropdownService()
