const { withAppBuildGradle, withDangerousMod, withMainActivity, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin para forçar API Level 35, edge-to-edge e 16 KB page sizes
 * Este plugin modifica o build.gradle e MainActivity ANTES do build
 */
module.exports = function withAndroidApi35(config) {
  // Modificar o build.gradle do app
  config = withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    console.log('[API35 Plugin] Modificando app/build.gradle...');

    // Substituir qualquer targetSdkVersion por 35
    buildGradle = buildGradle.replace(
      /targetSdkVersion\s+\d+/g,
      'targetSdkVersion 35'
    );

    // Substituir qualquer compileSdkVersion por 35
    buildGradle = buildGradle.replace(
      /compileSdkVersion\s+\d+/g,
      'compileSdkVersion 35'
    );

    // Se não encontrou targetSdkVersion, adicionar em defaultConfig
    if (!buildGradle.includes('targetSdkVersion 35')) {
      if (buildGradle.includes('defaultConfig')) {
        buildGradle = buildGradle.replace(
          /(defaultConfig\s*\{)/,
          '$1\n            targetSdkVersion 35'
        );
        console.log('[API35 Plugin] Adicionado targetSdkVersion 35 em defaultConfig');
      } else if (buildGradle.includes('android {')) {
        // Adicionar defaultConfig se não existir
        buildGradle = buildGradle.replace(
          /(android\s*\{)/,
          '$1\n        defaultConfig {\n            targetSdkVersion 35\n        }'
        );
        console.log('[API35 Plugin] Criado defaultConfig com targetSdkVersion 35');
      }
    }

    // Se não encontrou compileSdkVersion, adicionar no android block
    if (!buildGradle.includes('compileSdkVersion 35')) {
      buildGradle = buildGradle.replace(
        /(android\s*\{)/,
        '$1\n    compileSdkVersion 35'
      );
      console.log('[API35 Plugin] Adicionado compileSdkVersion 35');
    }

    // Nota: enableUncompressedNativeLibs deve estar em gradle.properties, não no build.gradle

    // Verificar se foi aplicado
    if (buildGradle.includes('targetSdkVersion 35') && buildGradle.includes('compileSdkVersion 35')) {
      console.log('[API35 Plugin] ✅ API Level 35 aplicado com sucesso!');
    } else {
      console.warn('[API35 Plugin] ⚠️  Aviso: API Level 35 pode não ter sido aplicado corretamente');
    }

    config.modResults.contents = buildGradle;
    return config;
  });

  // Modificar MainActivity para adicionar edge-to-edge
  config = withMainActivity(config, (config) => {
    let mainActivity = config.modResults.contents;

    console.log('[API35 Plugin] Modificando MainActivity para edge-to-edge...');

    // Verificar se já tem edge-to-edge
    if (!mainActivity.includes('enableEdgeToEdge') && !mainActivity.includes('EdgeToEdge.enable')) {
      // Se for Kotlin
      if (mainActivity.includes('class MainActivity') && mainActivity.includes('override fun onCreate')) {
        // Adicionar import
        if (!mainActivity.includes('import androidx.core.view.WindowCompat')) {
          mainActivity = mainActivity.replace(
            /(package\s+[\w.]+;?\s*\n)/,
            '$1\nimport androidx.core.view.WindowCompat\n'
          );
        }
        // Adicionar enableEdgeToEdge no onCreate
        if (mainActivity.includes('super.onCreate(savedInstanceState)')) {
          mainActivity = mainActivity.replace(
            /(super\.onCreate\(savedInstanceState\))/,
            '$1\n        WindowCompat.setDecorFitsSystemWindows(window, false)'
          );
          console.log('[API35 Plugin] Adicionado edge-to-edge no MainActivity (Kotlin)');
        }
      }
      // Se for Java
      else if (mainActivity.includes('class MainActivity') && mainActivity.includes('protected void onCreate')) {
        // Adicionar import
        if (!mainActivity.includes('import androidx.core.view.WindowCompat')) {
          mainActivity = mainActivity.replace(
            /(package\s+[\w.]+;?\s*\n)/,
            '$1\nimport androidx.core.view.WindowCompat;\n'
          );
        }
        // Adicionar enableEdgeToEdge no onCreate
        if (mainActivity.includes('super.onCreate(savedInstanceState)')) {
          mainActivity = mainActivity.replace(
            /(super\.onCreate\(savedInstanceState\);)/,
            '$1\n    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);'
          );
          console.log('[API35 Plugin] Adicionado edge-to-edge no MainActivity (Java)');
        }
      }
    }

    config.modResults.contents = mainActivity;
    return config;
  });

  // Remover permissões de mídia que o expo-image-picker pode adicionar automaticamente
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    
    console.log('[API35 Plugin] Removendo permissões de mídia desnecessárias...');
    
    if (!manifest.manifest) {
      console.warn('[API35 Plugin] Manifest não encontrado');
      return config;
    }

    // Lista de permissões de mídia para remover
    const permissionsToRemove = [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ];

    // Verificar se há permissões no formato array
    if (manifest.manifest['uses-permission']) {
      const permissions = manifest.manifest['uses-permission'];
      
      if (Array.isArray(permissions)) {
        // Filtrar permissões removendo as de mídia
        manifest.manifest['uses-permission'] = permissions.filter((permission) => {
          const permissionName = permission.$?.['android:name'] || permission['android:name'];
          if (permissionsToRemove.includes(permissionName)) {
            console.log(`[API35 Plugin] Removendo permissão: ${permissionName}`);
            return false;
          }
          return true;
        });
      } else if (permissions.$) {
        // Formato único (não array)
        const permissionName = permissions.$?.['android:name'] || permissions['android:name'];
        if (permissionsToRemove.includes(permissionName)) {
          console.log(`[API35 Plugin] Removendo permissão única: ${permissionName}`);
          delete manifest.manifest['uses-permission'];
        }
      }
    }

    // Também verificar no formato de string (caso o manifest seja processado como XML)
    // Isso é uma camada extra de segurança
    if (typeof manifest.manifest === 'string') {
      permissionsToRemove.forEach(perm => {
        const regex = new RegExp(`<uses-permission[^>]*android:name="${perm.replace(/\./g, '\\.')}"[^>]*/>`, 'g');
        if (manifest.manifest.includes(perm)) {
          manifest.manifest = manifest.manifest.replace(regex, '');
          console.log(`[API35 Plugin] Removendo permissão (string): ${perm}`);
        }
      });
    }

    console.log('[API35 Plugin] ✅ Permissões de mídia removidas com sucesso!');
    
    return config;
  });

  // Etapa final: modificar AndroidManifest.xml diretamente como arquivo XML
  // Isso garante que as permissões sejam removidas mesmo se outros plugins as adicionarem depois
  // Esta etapa é executada DEPOIS de todos os outros plugins processarem
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const manifestPath = path.join(config.modRequest.platformProjectRoot, 'app/src/main/AndroidManifest.xml');
      
      if (fs.existsSync(manifestPath)) {
        console.log('[API35 Plugin] 🔍 Verificando e removendo permissões de mídia do AndroidManifest.xml...');
        
        let manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const originalContent = manifestContent;
        
        // Lista de permissões de mídia para remover
        const permissionsToRemove = [
          'android.permission.READ_MEDIA_IMAGES',
          'android.permission.READ_MEDIA_VIDEO',
          'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
          'android.permission.READ_EXTERNAL_STORAGE',
          'android.permission.WRITE_EXTERNAL_STORAGE',
        ];
        
        let removedCount = 0;
        
        // Remover cada permissão usando múltiplos padrões regex
        permissionsToRemove.forEach(perm => {
          const escapedPerm = perm.replace(/\./g, '\\.');
          
          // Padrão 1: Tag completa em uma linha
          const pattern1 = new RegExp(`\\s*<uses-permission[^>]*android:name="${escapedPerm}"[^>]*/>\\s*\\n?`, 'g');
          const before1 = manifestContent.length;
          manifestContent = manifestContent.replace(pattern1, '');
          if (manifestContent.length !== before1) {
            removedCount++;
            console.log(`[API35 Plugin] ✅ Removida permissão (padrão 1): ${perm}`);
          }
          
          // Padrão 2: Tag com quebra de linha
          const pattern2 = new RegExp(`<uses-permission[^>]*\\n?[^>]*android:name="${escapedPerm}"[^>]*\\n?[^>]*/>`, 'g');
          const before2 = manifestContent.length;
          manifestContent = manifestContent.replace(pattern2, '');
          if (manifestContent.length !== before2 && manifestContent.length === before1) {
            removedCount++;
            console.log(`[API35 Plugin] ✅ Removida permissão (padrão 2): ${perm}`);
          }
          
          // Padrão 3: Tag com espaços variados
          const pattern3 = new RegExp(`<uses-permission\\s+android:name="${escapedPerm}"[^>]*/>`, 'g');
          const before3 = manifestContent.length;
          manifestContent = manifestContent.replace(pattern3, '');
          if (manifestContent.length !== before3 && manifestContent.length === before1 && manifestContent.length === before2) {
            removedCount++;
            console.log(`[API35 Plugin] ✅ Removida permissão (padrão 3): ${perm}`);
          }
        });
        
        // Verificar se ainda há alguma referência às permissões e remover de forma mais agressiva
        permissionsToRemove.forEach(perm => {
          if (manifestContent.includes(perm)) {
            console.warn(`[API35 Plugin] ⚠️  Ainda há referência a ${perm} no manifest! Tentando remover...`);
            
            // Tentar múltiplas estratégias de remoção
            const escapedPerm = perm.replace(/\./g, '\\.');
            
            // Estratégia 1: Remover linha completa que contenha a permissão
            const lines = manifestContent.split('\n');
            const filteredLines = lines.filter(line => {
              // Remover linha se contiver a permissão (mesmo que parcialmente)
              return !line.includes(perm) && !line.match(new RegExp(escapedPerm));
            });
            
            if (filteredLines.length < lines.length) {
              manifestContent = filteredLines.join('\n');
              console.log(`[API35 Plugin] ✅ Removida(s) ${lines.length - filteredLines.length} linha(s) contendo ${perm}`);
            }
            
            // Estratégia 2: Remover qualquer tag que contenha a permissão (caso ainda exista)
            const patterns = [
              new RegExp(`<[^>]*${escapedPerm}[^>]*>`, 'g'),
              new RegExp(`[^<]*${escapedPerm}[^>]*>`, 'g'),
              new RegExp(`.*${escapedPerm}.*`, 'g'),
            ];
            
            patterns.forEach((pattern, idx) => {
              const before = manifestContent.length;
              manifestContent = manifestContent.replace(pattern, '');
              if (manifestContent.length !== before) {
                console.log(`[API35 Plugin] ✅ Removida referência a ${perm} usando padrão ${idx + 1}`);
              }
            });
          }
        });
        
        // Só escrever se houve mudanças
        if (manifestContent !== originalContent) {
          fs.writeFileSync(manifestPath, manifestContent, 'utf8');
          console.log(`[API35 Plugin] ✅ AndroidManifest.xml atualizado! ${removedCount} permissão(ões) removida(s).`);
        } else {
          console.log('[API35 Plugin] ℹ️  Nenhuma permissão de mídia encontrada no manifest');
        }
      } else {
        console.warn('[API35 Plugin] ⚠️  AndroidManifest.xml não encontrado em:', manifestPath);
      }
      
      return config;
    },
  ]);

  return config;
};
