
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "abilities": {
                  Row: {
                    "description": string | null,"id": number,"is_aura": boolean,"name": string,"type": Database["public"]['Enums']["ability_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: never,"is_aura"?: boolean,"name": string,"type": Database["public"]['Enums']["ability_type"]
                  }
                  Update: {
                    "description"?: string | null,"id"?: never,"is_aura"?: boolean,"name"?: string,"type"?: Database["public"]['Enums']["ability_type"]
                  }
                  Relationships: [
                    
                  ]
                },"army_list_units": {
                  Row: {
                    "army_list_id": string,"attached_to_id": string | null,"datasheet_id": number,"enhancement_id": number | null,"id": string,"sort_order": number,"unit_size_id": number,"wargear_notes": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "army_list_id": string,"attached_to_id"?: string | null,"datasheet_id": number,"enhancement_id"?: number | null,"id"?: string,"sort_order"?: number,"unit_size_id": number,"wargear_notes"?: string | null
                  }
                  Update: {
                    "army_list_id"?: string,"attached_to_id"?: string | null,"datasheet_id"?: number,"enhancement_id"?: number | null,"id"?: string,"sort_order"?: number,"unit_size_id"?: number,"wargear_notes"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "army_list_units_army_list_id_fkey"
      columns: ["army_list_id"]
isOneToOne: false
      referencedRelation: "army_list_totals"
      referencedColumns: ["army_list_id"]
    },{
      foreignKeyName: "army_list_units_army_list_id_fkey"
      columns: ["army_list_id"]
isOneToOne: false
      referencedRelation: "army_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "army_list_units_attached_to_id_army_list_id_fkey"
      columns: ["attached_to_id","army_list_id"]
isOneToOne: false
      referencedRelation: "army_list_units"
      referencedColumns: ["id","army_list_id"]
    },{
      foreignKeyName: "army_list_units_datasheet_id_fkey"
      columns: ["datasheet_id"]
isOneToOne: false
      referencedRelation: "datasheets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "army_list_units_enhancement_id_fkey"
      columns: ["enhancement_id"]
isOneToOne: false
      referencedRelation: "enhancements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "army_list_units_unit_size_id_fkey"
      columns: ["unit_size_id"]
isOneToOne: false
      referencedRelation: "unit_sizes"
      referencedColumns: ["id"]
    }
                  ]
                },"army_lists": {
                  Row: {
                    "created_at": string,"detachment_id": number | null,"faction_id": number,"id": string,"is_public": boolean,"name": string,"notes": string | null,"owner_id": string,"points_limit": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"detachment_id"?: number | null,"faction_id": number,"id"?: string,"is_public"?: boolean,"name": string,"notes"?: string | null,"owner_id"?: string,"points_limit"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"detachment_id"?: number | null,"faction_id"?: number,"id"?: string,"is_public"?: boolean,"name"?: string,"notes"?: string | null,"owner_id"?: string,"points_limit"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "army_lists_detachment_id_fkey"
      columns: ["detachment_id"]
isOneToOne: false
      referencedRelation: "detachments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "army_lists_faction_id_fkey"
      columns: ["faction_id"]
isOneToOne: false
      referencedRelation: "factions"
      referencedColumns: ["id"]
    }
                  ]
                },"datasheet_abilities": {
                  Row: {
                    "ability_id": number,"datasheet_id": number,"value": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ability_id": number,"datasheet_id": number,"value"?: string | null
                  }
                  Update: {
                    "ability_id"?: number,"datasheet_id"?: number,"value"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "datasheet_abilities_ability_id_fkey"
      columns: ["ability_id"]
isOneToOne: false
      referencedRelation: "abilities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "datasheet_abilities_datasheet_id_fkey"
      columns: ["datasheet_id"]
isOneToOne: false
      referencedRelation: "datasheets"
      referencedColumns: ["id"]
    }
                  ]
                },"datasheet_keywords": {
                  Row: {
                    "datasheet_id": number,"keyword_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "datasheet_id": number,"keyword_id": number
                  }
                  Update: {
                    "datasheet_id"?: number,"keyword_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "datasheet_keywords_datasheet_id_fkey"
      columns: ["datasheet_id"]
isOneToOne: false
      referencedRelation: "datasheets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "datasheet_keywords_keyword_id_fkey"
      columns: ["keyword_id"]
isOneToOne: false
      referencedRelation: "keywords"
      referencedColumns: ["id"]
    }
                  ]
                },"datasheet_weapons": {
                  Row: {
                    "datasheet_id": number,"is_default": boolean,"weapon_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "datasheet_id": number,"is_default"?: boolean,"weapon_id": number
                  }
                  Update: {
                    "datasheet_id"?: number,"is_default"?: boolean,"weapon_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "datasheet_weapons_datasheet_id_fkey"
      columns: ["datasheet_id"]
isOneToOne: false
      referencedRelation: "datasheets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "datasheet_weapons_weapon_id_fkey"
      columns: ["weapon_id"]
isOneToOne: false
      referencedRelation: "weapons"
      referencedColumns: ["id"]
    }
                  ]
                },"datasheets": {
                  Row: {
                    "base_size": string | null,"composition": string | null,"created_at": string,"faction_id": number,"id": number,"lore": string | null,"name": string,"role": Database["public"]['Enums']["battlefield_role"],"slug": string,"updated_at": string,"wargear_options": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "base_size"?: string | null,"composition"?: string | null,"created_at"?: string,"faction_id": number,"id"?: never,"lore"?: string | null,"name": string,"role"?: Database["public"]['Enums']["battlefield_role"],"slug": string,"updated_at"?: string,"wargear_options"?: string | null
                  }
                  Update: {
                    "base_size"?: string | null,"composition"?: string | null,"created_at"?: string,"faction_id"?: number,"id"?: never,"lore"?: string | null,"name"?: string,"role"?: Database["public"]['Enums']["battlefield_role"],"slug"?: string,"updated_at"?: string,"wargear_options"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "datasheets_faction_id_fkey"
      columns: ["faction_id"]
isOneToOne: false
      referencedRelation: "factions"
      referencedColumns: ["id"]
    }
                  ]
                },"detachments": {
                  Row: {
                    "description": string | null,"faction_id": number,"id": number,"name": string,"rule": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"faction_id": number,"id"?: never,"name": string,"rule"?: string | null
                  }
                  Update: {
                    "description"?: string | null,"faction_id"?: number,"id"?: never,"name"?: string,"rule"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "detachments_faction_id_fkey"
      columns: ["faction_id"]
isOneToOne: false
      referencedRelation: "factions"
      referencedColumns: ["id"]
    }
                  ]
                },"enhancements": {
                  Row: {
                    "description": string | null,"detachment_id": number,"id": number,"name": string,"points": number,"restriction": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"detachment_id": number,"id"?: never,"name": string,"points": number,"restriction"?: string | null
                  }
                  Update: {
                    "description"?: string | null,"detachment_id"?: number,"id"?: never,"name"?: string,"points"?: number,"restriction"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "enhancements_detachment_id_fkey"
      columns: ["detachment_id"]
isOneToOne: false
      referencedRelation: "detachments"
      referencedColumns: ["id"]
    }
                  ]
                },"factions": {
                  Row: {
                    "army_rule": string | null,"created_at": string,"id": number,"name": string,"parent_id": number | null,"slug": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "army_rule"?: string | null,"created_at"?: string,"id"?: never,"name": string,"parent_id"?: number | null,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "army_rule"?: string | null,"created_at"?: string,"id"?: never,"name"?: string,"parent_id"?: number | null,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "factions_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "factions"
      referencedColumns: ["id"]
    }
                  ]
                },"keywords": {
                  Row: {
                    "id": number,"is_faction": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"is_faction"?: boolean,"name": string
                  }
                  Update: {
                    "id"?: never,"is_faction"?: boolean,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"leader_attachments": {
                  Row: {
                    "bodyguard_id": number,"leader_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "bodyguard_id": number,"leader_id": number
                  }
                  Update: {
                    "bodyguard_id"?: number,"leader_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "leader_attachments_bodyguard_id_fkey"
      columns: ["bodyguard_id"]
isOneToOne: false
      referencedRelation: "datasheets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leader_attachments_leader_id_fkey"
      columns: ["leader_id"]
isOneToOne: false
      referencedRelation: "datasheets"
      referencedColumns: ["id"]
    }
                  ]
                },"model_profiles": {
                  Row: {
                    "datasheet_id": number,"id": number,"invuln_save": number | null,"leadership": number,"movement": string,"name": string,"oc": number,"save": number,"sort_order": number,"toughness": number,"wounds": number
                  }
                  ComputedFields: never
                  Insert: {
                    "datasheet_id": number,"id"?: never,"invuln_save"?: number | null,"leadership": number,"movement": string,"name": string,"oc": number,"save": number,"sort_order"?: number,"toughness": number,"wounds": number
                  }
                  Update: {
                    "datasheet_id"?: number,"id"?: never,"invuln_save"?: number | null,"leadership"?: number,"movement"?: string,"name"?: string,"oc"?: number,"save"?: number,"sort_order"?: number,"toughness"?: number,"wounds"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "model_profiles_datasheet_id_fkey"
      columns: ["datasheet_id"]
isOneToOne: false
      referencedRelation: "datasheets"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stratagems": {
                  Row: {
                    "category": Database["public"]['Enums']["stratagem_category"],"cp_cost": number,"detachment_id": number | null,"effect": string,"id": number,"name": string,"phase": Database["public"]['Enums']["game_phase"],"restrictions": string | null,"target": string | null,"turn": string | null,"when": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["stratagem_category"],"cp_cost": number,"detachment_id"?: number | null,"effect": string,"id"?: never,"name": string,"phase": Database["public"]['Enums']["game_phase"],"restrictions"?: string | null,"target"?: string | null,"turn"?: string | null,"when"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["stratagem_category"],"cp_cost"?: number,"detachment_id"?: number | null,"effect"?: string,"id"?: never,"name"?: string,"phase"?: Database["public"]['Enums']["game_phase"],"restrictions"?: string | null,"target"?: string | null,"turn"?: string | null,"when"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "stratagems_detachment_id_fkey"
      columns: ["detachment_id"]
isOneToOne: false
      referencedRelation: "detachments"
      referencedColumns: ["id"]
    }
                  ]
                },"unit_sizes": {
                  Row: {
                    "datasheet_id": number,"id": number,"models": number,"points": number
                  }
                  ComputedFields: never
                  Insert: {
                    "datasheet_id": number,"id"?: never,"models": number,"points": number
                  }
                  Update: {
                    "datasheet_id"?: number,"id"?: never,"models"?: number,"points"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "unit_sizes_datasheet_id_fkey"
      columns: ["datasheet_id"]
isOneToOne: false
      referencedRelation: "datasheets"
      referencedColumns: ["id"]
    }
                  ]
                },"weapon_profiles": {
                  Row: {
                    "ap": number,"attacks": string,"damage": string,"id": number,"keywords": (string)[],"name": string,"range": number | null,"skill": number | null,"strength": number,"type": Database["public"]['Enums']["weapon_type"],"weapon_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ap"?: number,"attacks": string,"damage": string,"id"?: never,"keywords"?: (string)[],"name": string,"range"?: number | null,"skill"?: number | null,"strength": number,"type": Database["public"]['Enums']["weapon_type"],"weapon_id": number
                  }
                  Update: {
                    "ap"?: number,"attacks"?: string,"damage"?: string,"id"?: never,"keywords"?: (string)[],"name"?: string,"range"?: number | null,"skill"?: number | null,"strength"?: number,"type"?: Database["public"]['Enums']["weapon_type"],"weapon_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "weapon_profiles_weapon_id_fkey"
      columns: ["weapon_id"]
isOneToOne: false
      referencedRelation: "weapons"
      referencedColumns: ["id"]
    }
                  ]
                },"weapons": {
                  Row: {
                    "id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"name": string
                  }
                  Update: {
                    "id"?: never,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "army_list_totals": {
                  Row: {
                    "army_list_id": string,"points_limit": number,"points_total": number | null,"unit_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "ability_type": "core"|"faction"|"datasheet"|"wargear","battlefield_role": "epic_hero"|"character"|"battleline"|"dedicated_transport"|"fortification"|"other","game_phase": "command"|"movement"|"shooting"|"charge"|"fight"|"any","stratagem_category": "battle_tactic"|"strategic_ploy"|"epic_deed"|"wargear","weapon_type": "ranged"|"melee"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "ability_type": ["core", "faction", "datasheet", "wargear"],"battlefield_role": ["epic_hero", "character", "battleline", "dedicated_transport", "fortification", "other"],"game_phase": ["command", "movement", "shooting", "charge", "fight", "any"],"stratagem_category": ["battle_tactic", "strategic_ploy", "epic_deed", "wargear"],"weapon_type": ["ranged", "melee"]
          }
        }
} as const
