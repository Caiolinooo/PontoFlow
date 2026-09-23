import subprocess
import sys
from pathlib import Path

# Caminho do projeto
project_path = r"D:\Projeto\Finalizados\2_Time-Sheet - Manager ABZ Group\mobile"

def run_command(cmd, timeout=None):
    """Executa um comando e retorna o resultado."""
    print(f"\n{'='*60}")
    print(f"Comando: {cmd}")
    print('='*60)
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        if result.stdout:
            print(result.stdout)
        if result.stderr and result.returncode != 0:
            print("ERROS:", result.stderr)
            
        return result
    except subprocess.TimeoutExpired:
        print("Comando timed out (mas continua em background)")
        return None
    except Exception as e:
        print(f"Erro: {e}")
        return None

# Primeiro, instalar dependências se necessário
print("PASSO 1: Instalando dependências...")
run_command(f'npm install --legacy-peer-deps "{project_path}"', timeout=180)

if __name__ == "__main__":
    # Você pode escolher qual comando executar:
    
    # Opção A - Expo run android (build local)
    print("\nPASSO 2: Executando expo run:android")
    run_command(f'npx expo run:android "{project_path}"', timeout=600)
