# Manual do Sistema de Processos Jurídicos

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Permissões e Acessos](#permissões-e-acessos)
3. [Fluxo de Trabalho](#fluxo-de-trabalho)
4. [Como o Jurídico Trabalha](#como-o-jurídico-trabalha)
5. [Como o Administrador Trabalha](#como-o-administrador-trabalha)
6. [Campos e Informações](#campos-e-informações)
7. [Parcelas e Pagamentos](#parcelas-e-pagamentos)
8. [Perguntas Frequentes](#perguntas-frequentes)

---

## 🎯 Visão Geral

O sistema de **Processos Jurídicos** permite gerenciar processos em andamento, controlar pagamentos de custas, contribuições e honorários, e acompanhar o status de cada parcela financeira relacionada aos processos.

**Localização no sistema:** Menu **Financeiro** → **Processos Jurídicos**

---

## 🔐 Permissões e Acessos

### **Jurídico** (e Master)
- ✅ **Pode criar** novos processos
- ✅ **Pode editar** todos os campos e valores
- ✅ **Pode marcar** parcelas como pagas/não pagas
- ✅ **Pode enviar** comprovantes de pagamento
- ✅ **Pode visualizar** todos os processos

### **Administrador**
- ❌ **NÃO pode criar** processos
- ❌ **NÃO pode editar** valores e campos do processo
- ✅ **Pode visualizar** todos os processos e valores (somente leitura)
- ✅ **Pode marcar** parcelas como pagas/não pagas
- ✅ **Pode enviar** comprovantes de pagamento

### **RH**
- ❌ **NÃO pode criar** processos
- ❌ **NÃO pode editar** valores
- ✅ **Pode visualizar** processos
- ✅ **Pode marcar** parcelas como pagas/não pagas
- ✅ **Pode enviar** comprovantes

---

## 🔄 Fluxo de Trabalho

```
1. JURÍDICO cria o processo
   ↓
2. JURÍDICO cadastra valores (custas, contribuições, honorários)
   ↓
3. JURÍDICO cria parcelas (valores e datas de vencimento)
   ↓
4. ADMINISTRADOR visualiza o processo e parcelas pendentes
   ↓
5. ADMINISTRADOR efetua o pagamento
   ↓
6. ADMINISTRADOR envia comprovante (upload)
   ↓
7. ADMINISTRADOR marca parcela como PAGA
   ↓
8. Sistema registra: quem marcou, quando, e anexa comprovante
```

---

## 👨‍⚖️ Como o Jurídico Trabalha

### **Criar um Novo Processo**

1. Acesse: **Financeiro** → **Processos Jurídicos**
2. Clique no botão **"+ Novo Processo"**
3. Preencha os campos:

#### **Dados Básicos do Processo**
- **Número do Processo** * (obrigatório)
  - Exemplo: `1234567-89.2024.8.26.0100`
- **Tipo de Processo**
  - Exemplo: Trabalhista, Cível, Tributário
- **Reclamante**
  - Nome da pessoa/empresa que está processando
- **Advogado**
  - Nome do advogado responsável
- **Escritório de Advocacia**
  - Nome do escritório
- **Valor da Causa**
  - Valor total do processo em reais

#### **Custas e Pagamentos**
- **Custas Processuais**
  - Valor total das custas processuais
- **Contribuições Previdenciárias**
  - Valor das contribuições
- **Honorários Periciais**
  - Valor dos honorários periciais
- **Dados de Pagamento**
  - Informações sobre formas de pagamento, prazos, etc.
- **Contas Bancárias**
  - Banco, agência, conta, tipo de conta para pagamentos

#### **Configuração de Parcelas**

O sistema permite criar parcelas automaticamente:

1. **Valor Total a Parcelar**
   - Digite o valor total que será dividido em parcelas
2. **Data Inicial**
   - Data da primeira parcela (ex: 01/02/2025)
3. **Data Final**
   - Data da última parcela (ex: 01/12/2025)

**O sistema irá:**
- Calcular automaticamente quantas parcelas existem entre as datas
- Dividir o valor total igualmente entre as parcelas
- Criar uma parcela para cada mês

**Exemplo:**
- Valor Total: R$ 12.000,00
- Data Inicial: 01/02/2025
- Data Final: 01/12/2025
- **Resultado:** 11 parcelas de R$ 1.090,91 cada (última parcela ajustada)

**⚠️ Importante:** Você pode editar os valores individuais de cada parcela antes de salvar, caso precise de valores diferentes por mês.

#### **Status do Processo**
- **Em Andamento** - Processo ativo
- **Aguardando Pagamento** - Aguardando pagamento de parcelas
- **Pago** - Todas as parcelas foram pagas
- **Arquivado** - Processo arquivado
- **Cancelado** - Processo cancelado

#### **Observações**
- Campo livre para anotações gerais sobre o processo

4. Clique em **"Criar Processo"**

### **Editar um Processo Existente**

1. Na lista de processos, clique no ícone de **lápis (✏️)** ao lado do processo
2. Faça as alterações necessárias
3. Clique em **"Atualizar"**

**⚠️ Atenção:** Ao editar parcelas, o sistema irá **deletar todas as parcelas existentes** e criar novas com base nos dados informados. Certifique-se de que os valores estão corretos antes de salvar.

### **Excluir um Processo**

1. Clique no ícone de **lixeira (🗑️)** ao lado do processo
2. Confirme a exclusão

**⚠️ Cuidado:** Esta ação não pode ser desfeita e excluirá todas as parcelas relacionadas.

---

## 👔 Como o Administrador Trabalha

### **Visualizar Processos**

1. Acesse: **Financeiro** → **Processos Jurídicos**
2. Você verá uma lista com todos os processos
3. Use os **filtros** para buscar por:
   - Número do processo
   - Reclamante
   - Advogado
   - Status

### **Visualizar Detalhes de um Processo**

Na tabela, você verá:
- **Número do Processo**
- **Reclamante**
- **Advogado**
- **Tipo**
- **Valor da Causa**
- **Parcelas Pendentes** (valor total e quantidade)
- **Status do Processo**

### **Gerenciar Pagamento de Parcelas**

#### **Passo 1: Acessar a Parcela**

Na coluna **"Parcelas"**, você verá botões com os valores de cada parcela. Clique no botão da parcela que deseja gerenciar.

**Exemplo:**
```
Parcelas:
[R$ 1.090,91] [R$ 1.090,91] [R$ 1.090,91] [+3 mais]
```

#### **Passo 2: Enviar Comprovante de Pagamento**

1. No diálogo que abrir, você verá:
   - **Status Atual** da parcela (Pendente, Paga, Vencida)
   - **Valor** da parcela
   - **Data de Vencimento**

2. Clique em **"Escolher arquivo"** no campo **"Enviar Comprovante de Pagamento"**
3. Selecione o arquivo (JPG, PNG, WEBP ou PDF - máximo 10MB)
4. O sistema fará upload automaticamente

**✅ O comprovante será salvo e ficará disponível para visualização**

#### **Passo 3: Marcar como Pago**

1. Após enviar o comprovante (ou se já tiver enviado anteriormente)
2. Clique no botão **"Marcar como Pago"** (ícone ✓ verde)
3. O sistema irá:
   - Alterar o status para **"Paga"**
   - Registrar **quem** marcou (seu nome)
   - Registrar **quando** foi marcado (data e hora)
   - Salvar o comprovante anexado

#### **Marcar como Não Pago (Reverter)**

Se você marcou por engano:

1. Clique no botão **"Marcar como Não Pago"** (ícone ✗)
2. O sistema irá:
   - Alterar o status para **"Pendente"**
   - Limpar os dados de pagamento
   - **Manter o comprovante** (caso queira reutilizar depois)

### **Visualizar Histórico de Pagamento**

No diálogo de pagamento, você verá:
- **Quem marcou** como pago (nome e email)
- **Quando foi marcado** (data e hora)
- **Link para visualizar** o comprovante (se houver)

---

## 📝 Campos e Informações

### **Campos do Processo**

| Campo | Obrigatório | Quem Preenche | Descrição |
|-------|-------------|---------------|-----------|
| Número do Processo | ✅ Sim | Jurídico | Número oficial do processo |
| Tipo de Processo | ❌ Não | Jurídico | Tipo (Trabalhista, Cível, etc.) |
| Reclamante | ❌ Não | Jurídico | Quem está processando |
| Advogado | ❌ Não | Jurídico | Nome do advogado |
| Escritório | ❌ Não | Jurídico | Nome do escritório |
| Valor da Causa | ❌ Não | Jurídico | Valor total do processo |
| Custas Processuais | ❌ Não | Jurídico | Valor das custas |
| Contribuições Previdenciárias | ❌ Não | Jurídico | Valor das contribuições |
| Honorários Periciais | ❌ Não | Jurídico | Valor dos honorários |
| Dados de Pagamento | ❌ Não | Jurídico | Informações sobre pagamento |
| Contas Bancárias | ❌ Não | Jurídico | Dados bancários |
| Status | ✅ Sim | Jurídico | Status do processo |
| Observações | ❌ Não | Jurídico | Anotações gerais |

### **Campos da Parcela**

| Campo | Obrigatório | Quem Preenche | Descrição |
|-------|-------------|---------------|-----------|
| Valor | ✅ Sim | Jurídico | Valor da parcela |
| Dia de Vencimento | ✅ Sim | Jurídico | Dia do mês (1-31) |
| Mês de Vencimento | ✅ Sim | Jurídico | Mês (1-12) |
| Ano de Vencimento | ❌ Não | Jurídico | Ano (null = recorrente) |
| Status | ✅ Sim | Sistema/Admin | Pendente, Paga, Vencida |
| Comprovante | ❌ Não | Administrador | Arquivo do comprovante |
| Observações | ❌ Não | Jurídico/Admin | Anotações sobre a parcela |

---

## 💰 Parcelas e Pagamentos

### **Como Funcionam as Parcelas**

As parcelas são criadas pelo **Jurídico** e representam pagamentos mensais ou periódicos relacionados ao processo.

**Exemplo Prático:**
```
Processo: 1234567-89.2024.8.26.0100
Valor Total a Parcelar: R$ 12.000,00
Data Inicial: 01/02/2025
Data Final: 01/12/2025

Parcelas Criadas:
- Parcela 1: R$ 1.090,91 - Vencimento: 01/02/2025
- Parcela 2: R$ 1.090,91 - Vencimento: 01/03/2025
- Parcela 3: R$ 1.090,91 - Vencimento: 01/04/2025
...
- Parcela 11: R$ 1.090,91 - Vencimento: 01/12/2025
```

### **Status das Parcelas**

- **🟡 Pendente** - Ainda não foi paga
- **🟢 Paga** - Foi marcada como paga pelo Administrador
- **🔴 Vencida** - Passou da data de vencimento e não foi paga

### **Alertas de Vencimento**

O sistema mostra alertas quando:
- Uma parcela está **vencendo em 7 dias** ou menos
- Uma parcela **já está vencida**

Você verá um banner amarelo no topo da página com os processos que precisam de atenção.

### **Fluxo de Pagamento Completo**

```
1. Jurídico cria processo com parcelas
   ↓
2. Sistema mostra alerta quando parcela está próxima do vencimento
   ↓
3. Administrador visualiza processo e parcelas pendentes
   ↓
4. Administrador efetua pagamento no banco/escritório
   ↓
5. Administrador faz upload do comprovante no sistema
   ↓
6. Administrador marca parcela como "Paga"
   ↓
7. Sistema registra:
   - Status: PAGA
   - Data do pagamento
   - Quem marcou (Administrador)
   - Comprovante anexado
   ↓
8. Parcela aparece como "Paga" na lista
```

---

## ❓ Perguntas Frequentes

### **P: O Administrador pode editar valores das parcelas?**
**R:** Não. Apenas o **Jurídico** pode criar e editar valores. O Administrador apenas visualiza e marca como pago.

### **P: O que acontece se eu marcar uma parcela como paga sem enviar comprovante?**
**R:** Você pode marcar como paga sem comprovante, mas é **altamente recomendado** sempre enviar o comprovante para manter o histórico documentado.

### **P: Posso marcar uma parcela como "não paga" depois de marcar como paga?**
**R:** Sim! Use o botão **"Marcar como Não Pago"** para reverter. O comprovante será mantido caso você queira reutilizar.

### **P: Como edito os valores das parcelas depois de criar o processo?**
**R:** Apenas o **Jurídico** pode editar. Clique no ícone de lápis (✏️) ao lado do processo e ajuste os valores. **⚠️ Atenção:** Isso irá recriar todas as parcelas.

### **P: O que acontece se eu excluir um processo?**
**R:** Todas as parcelas relacionadas serão excluídas também. Esta ação **não pode ser desfeita**.

### **P: Posso criar parcelas manualmente sem usar o gerador automático?**
**R:** Sim! O sistema permite editar os valores individuais de cada parcela antes de salvar o processo.

### **P: Onde vejo quem marcou uma parcela como paga?**
**R:** No diálogo de pagamento da parcela, você verá:
- Nome e email de quem marcou
- Data e hora em que foi marcado
- Link para visualizar o comprovante

### **P: Posso anexar mais de um comprovante?**
**R:** Não. Cada parcela aceita apenas um comprovante. Se precisar substituir, faça upload de um novo arquivo (ele substituirá o anterior).

### **P: Quais formatos de arquivo são aceitos para comprovante?**
**R:** JPG, PNG, WEBP ou PDF. Tamanho máximo: 10MB.

### **P: Como filtro processos por status?**
**R:** Use o filtro **"Status"** no topo da página para filtrar por:
- Em Andamento
- Aguardando Pagamento
- Pago
- Arquivado
- Cancelado

### **P: O que significa "Valor pendente" na tabela?**
**R:** É a soma de todas as parcelas que ainda não foram pagas daquele processo.

---

## 🎯 Resumo Rápido

### **Para o Jurídico:**
1. ✅ Criar processos com todos os dados
2. ✅ Cadastrar valores (custas, contribuições, honorários)
3. ✅ Criar parcelas (automático ou manual)
4. ✅ Editar processos quando necessário
5. ✅ Marcar pagamentos (opcional)

### **Para o Administrador:**
1. 👁️ Visualizar processos e valores (somente leitura)
2. 📤 Enviar comprovantes de pagamento
3. ✅ Marcar parcelas como pagas
4. ❌ Marcar como não pago (se necessário)
5. 📊 Acompanhar status e vencimentos

---

## 📞 Suporte

Em caso de dúvidas ou problemas, entre em contato com o suporte técnico.

---

**Última atualização:** Janeiro 2026
