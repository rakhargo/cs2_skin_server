using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Commands;

namespace InspectBridge;

public class InspectBridge : BasePlugin
{
    public override string ModuleName => "CS2 Skin Inspect Bridge";
    public override string ModuleVersion => "1.1.0";
    public override string ModuleAuthor => "Antigravity";
    public override string ModuleDescription => "Bridges CS2 in-game inspect and gen commands with a local Node.js API / Web UI.";

    private static readonly HttpClient _httpClient = new();
    private const string ApiUrl = "http://localhost:3000/inspect?url=";
    private const string AuthKey = "local_inspect_secret_key"; // Must match AUTH_KEY in .env

    // Maps weapon definition index (defindex) to its developer console name
    private static readonly Dictionary<int, string> WeaponMap = new()
    {
        { 1, "weapon_deagle" },
        { 2, "weapon_elite" },
        { 3, "weapon_fiveseven" },
        { 4, "weapon_glock" },
        { 7, "weapon_ak47" },
        { 8, "weapon_aug" },
        { 9, "weapon_awp" },
        { 10, "weapon_famas" },
        { 11, "weapon_g3sg1" },
        { 13, "weapon_galilar" },
        { 14, "weapon_m249" },
        { 16, "weapon_m4a1" }, // M4A4
        { 17, "weapon_mac10" },
        { 19, "weapon_p90" },
        { 23, "weapon_mp5sd" },
        { 24, "weapon_ump45" },
        { 25, "weapon_xm1014" },
        { 26, "weapon_bizon" },
        { 27, "weapon_mag7" },
        { 28, "weapon_negev" },
        { 29, "weapon_sawedoff" },
        { 30, "weapon_tec9" },
        { 31, "weapon_taser" },
        { 32, "weapon_hkp2000" },
        { 33, "weapon_mp7" },
        { 34, "weapon_mp9" },
        { 35, "weapon_nova" },
        { 36, "weapon_p250" },
        { 38, "weapon_scar20" },
        { 39, "weapon_sg556" },
        { 40, "weapon_ssg08" },
        { 60, "weapon_m4a1_silencer" },
        { 61, "weapon_usp_silencer" },
        { 63, "weapon_cz75a" },
        { 64, "weapon_revolver" },
        
        // Knives
        { 42, "weapon_knife" },
        { 59, "weapon_knife" },
        { 500, "weapon_knife_bayonet" },
        { 503, "weapon_knife_css" },
        { 505, "weapon_knife_flip" },
        { 506, "weapon_knife_gut" },
        { 507, "weapon_knife_karambit" },
        { 508, "weapon_knife_m9_bayonet" },
        { 509, "weapon_knife_tactical" },
        { 512, "weapon_knife_falchion" },
        { 514, "weapon_knife_survival_bowie" },
        { 515, "weapon_knife_butterfly" },
        { 516, "weapon_knife_push" }, // shadow daggers
        { 517, "weapon_knife_cord" }, // paracord
        { 518, "weapon_knife_canis" }, // kukri
        { 519, "weapon_knife_ursus" },
        { 520, "weapon_knife_gypsy_jackknife" }, // navaja
        { 521, "weapon_knife_outdoor" },
        { 522, "weapon_knife_stiletto" },
        { 523, "weapon_knife_widowmaker" },
        { 525, "weapon_knife_skeleton" }
    };

    public override void Load(bool hotReload)
    {
        Console.WriteLine($"[InspectBridge] Plugin Loaded! Support for !gen (direct input) enabled.");

        // Register listener for Map Start to apply unlimited round settings
        RegisterListener<Listeners.OnMapStart>(mapName =>
        {
            // Use a 5-second timer to ensure standard gamemode configs have fully loaded and executed
            AddTimer(5.0f, () =>
            {
                Console.WriteLine("[InspectBridge] Applying unlimited round and zero damage settings...");
                Server.ExecuteCommand("sv_cheats 1");
                Server.ExecuteCommand("mp_warmuptime 0");
                Server.ExecuteCommand("mp_warmup_end");
                Server.ExecuteCommand("mp_freezetime 0");
                Server.ExecuteCommand("mp_buytime 99999");
                Server.ExecuteCommand("mp_buy_anywhere 1");
                Server.ExecuteCommand("mp_maxmoney 60000");
                Server.ExecuteCommand("mp_startmoney 60000");
                Server.ExecuteCommand("mp_afterroundmoney 60000");
                Server.ExecuteCommand("mp_limitteams 0");
                Server.ExecuteCommand("mp_autoteambalance 0");
                Server.ExecuteCommand("mp_autokick 0");
                Server.ExecuteCommand("mp_respawn_on_death_ct 1");
                Server.ExecuteCommand("mp_respawn_on_death_t 1");
                Server.ExecuteCommand("mp_round_restart_delay 0");
                Server.ExecuteCommand("mp_match_restart_delay 0");
                Server.ExecuteCommand("mp_roundtime 60");
                Server.ExecuteCommand("mp_roundtime_defuse 60");
                Server.ExecuteCommand("mp_roundtime_hostage 60");
                Server.ExecuteCommand("mp_ignore_round_win_conditions 1");
                
                // Zero damage scaling for both teams (CT & T, body & head)
                Server.ExecuteCommand("mp_damage_scale_ct_body 0");
                Server.ExecuteCommand("mp_damage_scale_ct_head 0");
                Server.ExecuteCommand("mp_damage_scale_t_body 0");
                Server.ExecuteCommand("mp_damage_scale_t_head 0");
                
                Server.ExecuteCommand("mp_restartgame 1");
            });
        });

        if (hotReload)
        {
            AddTimer(1.0f, () =>
            {
                Console.WriteLine("[InspectBridge] Hot reload detected, applying unlimited round and zero damage settings...");
                Server.ExecuteCommand("sv_cheats 1");
                Server.ExecuteCommand("mp_warmuptime 0");
                Server.ExecuteCommand("mp_warmup_end");
                Server.ExecuteCommand("mp_freezetime 0");
                Server.ExecuteCommand("mp_buytime 99999");
                Server.ExecuteCommand("mp_buy_anywhere 1");
                Server.ExecuteCommand("mp_maxmoney 60000");
                Server.ExecuteCommand("mp_startmoney 60000");
                Server.ExecuteCommand("mp_afterroundmoney 60000");
                Server.ExecuteCommand("mp_limitteams 0");
                Server.ExecuteCommand("mp_autoteambalance 0");
                Server.ExecuteCommand("mp_autokick 0");
                Server.ExecuteCommand("mp_respawn_on_death_ct 1");
                Server.ExecuteCommand("mp_respawn_on_death_t 1");
                Server.ExecuteCommand("mp_round_restart_delay 0");
                Server.ExecuteCommand("mp_match_restart_delay 0");
                Server.ExecuteCommand("mp_roundtime 60");
                Server.ExecuteCommand("mp_roundtime_defuse 60");
                Server.ExecuteCommand("mp_roundtime_hostage 60");
                Server.ExecuteCommand("mp_ignore_round_win_conditions 1");
                
                // Zero damage scaling for both teams (CT & T, body & head)
                Server.ExecuteCommand("mp_damage_scale_ct_body 0");
                Server.ExecuteCommand("mp_damage_scale_ct_head 0");
                Server.ExecuteCommand("mp_damage_scale_t_body 0");
                Server.ExecuteCommand("mp_damage_scale_t_head 0");
                
                Server.ExecuteCommand("mp_restartgame 1");
            });
        }
    }

    [ConsoleCommand("css_gen", "Generate a skin directly in game")]
    [ConsoleCommand("css_g", "Generate a skin directly in game")]
    public void OnGenCommand(CCSPlayerController? player, CommandInfo command)
    {
        if (player == null || !player.IsValid || player.IsBot) return;

        if (command.ArgCount < 5)
        {
            player.PrintToChat(" \x02[Inspect]\x01 Usage: !gen <defindex> <paintindex> <paintseed> <paintwear>");
            player.PrintToChat(" \x01Example: !gen 7 44 661 0.05");
            return;
        }

        if (!int.TryParse(command.ArgByIndex(1), out int defIndex) ||
            !int.TryParse(command.ArgByIndex(2), out int paintIndex) ||
            !int.TryParse(command.ArgByIndex(3), out int paintSeed) ||
            !float.TryParse(command.ArgByIndex(4), out float paintWear))
        {
            player.PrintToChat(" \x02[Inspect]\x01 Invalid parameters. Ensure parameters 1-4 are numeric.");
            return;
        }

        var itemData = new InspectItemData
        {
            defindex = defIndex,
            paintindex = paintIndex,
            paintseed = paintSeed,
            paintwear = paintWear
        };

        ApplyInspectSkin(player, itemData);
    }



    [ConsoleCommand("css_inspect_target", "Inspect a skin directly on a target player (for Web UI via RCON)")]
    public void OnInspectTargetCommand(CCSPlayerController? caller, CommandInfo command)
    {
        // Admin / Console only. Caller can be null when run from server console/RCON.
        if (command.ArgCount < 6)
        {
            Console.WriteLine("[InspectBridge] Usage: css_inspect_target <steamid64> <defindex> <paintindex> <paintseed> <paintwear>");
            return;
        }

        string steamIdStr = command.ArgByIndex(1);
        if (!ulong.TryParse(steamIdStr, out ulong steamId))
        {
            Console.WriteLine("[InspectBridge] Invalid SteamID64.");
            return;
        }

        if (!int.TryParse(command.ArgByIndex(2), out int defIndex) ||
            !int.TryParse(command.ArgByIndex(3), out int paintIndex) ||
            !int.TryParse(command.ArgByIndex(4), out int paintSeed) ||
            !float.TryParse(command.ArgByIndex(5), out float paintWear))
        {
            Console.WriteLine("[InspectBridge] Invalid skin arguments.");
            return;
        }

        // Find the player with this SteamID
        CCSPlayerController? targetPlayer = null;
        foreach (var p in Utilities.GetPlayers())
        {
            if (p.IsValid && !p.IsBot && p.SteamID == steamId)
            {
                targetPlayer = p;
                break;
            }
        }

        if (targetPlayer == null)
        {
            Console.WriteLine($"[InspectBridge] Player with SteamID {steamId} not found on server.");
            return;
        }

        // Apply the skin on the main game thread
        Server.NextFrame(() =>
        {
            var itemData = new InspectItemData
            {
                defindex = defIndex,
                paintindex = paintIndex,
                paintseed = paintSeed,
                paintwear = paintWear
            };
            ApplyInspectSkin(targetPlayer, itemData);
            targetPlayer.PrintToChat(" \x06[Inspect]\x01 Weapon spawned and skin applied from Web UI Generator!");
        });
    }

    private enum WeaponCategory
    {
        Primary,
        Pistol,
        Knife,
        Zeus,
        Unknown
    }

    private WeaponCategory GetWeaponCategory(int defIndex)
    {
        // Grenades and C4
        if (defIndex >= 43 && defIndex <= 49)
        {
            return WeaponCategory.Unknown;
        }
        if (defIndex == 42 || defIndex == 59 || defIndex >= 500)
        {
            return WeaponCategory.Knife;
        }
        if (defIndex == 31)
        {
            return WeaponCategory.Zeus;
        }
        if (defIndex == 1 || defIndex == 2 || defIndex == 3 || defIndex == 4 || 
            defIndex == 30 || defIndex == 32 || defIndex == 36 || defIndex == 61 || 
            defIndex == 63 || defIndex == 64)
        {
            return WeaponCategory.Pistol;
        }
        return WeaponCategory.Primary;
    }

    private string GetSlotCommand(WeaponCategory category)
    {
        return category switch
        {
            WeaponCategory.Knife => "slot3",
            WeaponCategory.Zeus => "slot3",
            WeaponCategory.Pistol => "slot2",
            WeaponCategory.Primary => "slot1",
            _ => "slot1"
        };
    }

    private int GetWeaponDefIndex(CBasePlayerWeapon weapon)
    {
        if (weapon != null && weapon.AttributeManager != null && weapon.AttributeManager.Item != null)
        {
            return weapon.AttributeManager.Item.ItemDefinitionIndex;
        }
        return 0;
    }

    private void ApplyInspectSkin(CCSPlayerController player, InspectItemData data)
    {
        if (player.PlayerPawn.Value == null || player.PlayerPawn.Value.WeaponServices == null)
        {
            player.PrintToChat(" \x02[Inspect]\x01 You must be alive and able to hold weapons to inspect skins.");
            return;
        }

        string weaponName;
        var targetCategory = GetWeaponCategory(data.defindex);
        string slotCmd = GetSlotCommand(targetCategory);

        if (targetCategory == WeaponCategory.Knife)
        {
            weaponName = "weapon_knife";
        }
        else
        {
            if (!WeaponMap.TryGetValue(data.defindex, out string? name))
            {
                player.PrintToChat($" \x02[Inspect]\x01 Unsupported weapon index: {data.defindex}");
                return;
            }
            weaponName = name;
        }

        var weaponServices = player.PlayerPawn.Value.WeaponServices;

        // Find existing weapon(s) of the same category to remove
        var weaponsToRemove = new List<CBasePlayerWeapon>();
        foreach (var weapon in weaponServices.MyWeapons)
        {
            if (weapon is { IsValid: true, Value.IsValid: true })
            {
                var category = GetWeaponCategory(GetWeaponDefIndex(weapon.Value));
                if (category == targetCategory)
                {
                    weaponsToRemove.Add(weapon.Value);
                }
            }
        }

        // Remove they from player
        foreach (var weapon in weaponsToRemove)
        {
            player.PlayerPawn.Value.RemovePlayerItem(weapon);
            weapon.Remove();
        }

        // Give the correct weapon
        player.GiveNamedItem(weaponName);

        // Schedule weapon attribute modification for the next frame once entity is registered
        Server.NextFrame(() =>
        {
            // Find the newly spawned weapon of the target category
            CBasePlayerWeapon? targetWeapon = null;
            foreach (var weapon in weaponServices.MyWeapons)
            {
                if (weapon is { IsValid: true, Value.IsValid: true })
                {
                    var category = GetWeaponCategory(GetWeaponDefIndex(weapon.Value));
                    if (category == targetCategory)
                    {
                        targetWeapon = weapon.Value;
                        break;
                    }
                }
            }

            if (targetWeapon == null)
            {
                Console.WriteLine($"[InspectBridge] Failed to find target weapon for category: {targetCategory}");
                return;
            }

            // Invoke ChangeSubclass input to let game update subclass and load correct 3D model
            if (targetCategory == WeaponCategory.Knife)
            {
                targetWeapon.AcceptInput("ChangeSubclass", null, null, data.defindex.ToString());
            }

            var attributeManager = targetWeapon.AttributeManager;
            if (attributeManager == null || attributeManager.Item == null) return;

            var item = attributeManager.Item;

            // Force custom fallback values
            item.ItemDefinitionIndex = (ushort)data.defindex;
            if (targetCategory == WeaponCategory.Knife)
            {
                item.EntityQuality = 3;
            }
            item.ItemIDHigh = 16384; // Tells client to use fallback attributes
            item.ItemIDLow = 0xFFFFFFFF;
            targetWeapon.FallbackPaintKit = data.paintindex;
            targetWeapon.FallbackSeed = data.paintseed;
            targetWeapon.FallbackWear = (float)data.paintwear;

            // Force the player's client to equip the slot, drawing the new model & skin
            player.ExecuteClientCommand(slotCmd);

            player.PrintToChat($" \x06[Inspect]\x01 Skin applied! Paint: \x04{data.paintindex}\x01 | Seed: \x04{data.paintseed}\x01 | Float: \x04{data.paintwear:F5}");
        });
    }
}

public class InspectApiResponse
{
    public bool success { get; set; }
    public string? type { get; set; }
    public InspectItemData? data { get; set; }
}

public class InspectItemData
{
    public int defindex { get; set; }
    public int paintindex { get; set; }
    public int paintseed { get; set; }
    public double paintwear { get; set; }
}
