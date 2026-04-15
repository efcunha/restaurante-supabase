import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, FieldRow, FormSection, Input, Navbar, Select } from '../../ui';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../design-system/tokens';

type FormPreviewShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

function FormPreviewShell({ title, subtitle, children }: FormPreviewShellProps) {
  return (
    <View style={styles.screen}>
      <Navbar title={title} subtitle={subtitle} leftAction={{ label: 'Voltar', onPress: () => undefined }} />
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

function ConfiguracaoMesasLayoutPreview() {
  const environments = useMemo(
    () => [
      { id: 'sal-principal', label: 'Salao Principal' },
      { id: 'varanda', label: 'Varanda' },
      { id: 'externo', label: 'Externo' },
    ],
    []
  );
  const [selectedEnvironment, setSelectedEnvironment] = useState(environments[0].id);
  const [environmentName, setEnvironmentName] = useState('Salao Principal');
  const [tableNumber, setTableNumber] = useState('12');
  const [tableSeats, setTableSeats] = useState('4');
  const [tableShape, setTableShape] = useState('square');

  return (
    <FormPreviewShell
      title="Configuracao de Mesas"
      subtitle="Preview real de composicao para revisao visual do formulario"
    >
      <View style={styles.tabRow}>
        {environments.map((environment) => {
          const active = selectedEnvironment === environment.id;
          return (
            <Pressable
              key={environment.id}
              onPress={() => setSelectedEnvironment(environment.id)}
              style={[styles.environmentTab, active && styles.environmentTabActive]}
            >
              <Text style={[styles.environmentTabText, active && styles.environmentTabTextActive]}>{environment.label}</Text>
            </Pressable>
          );
        })}
        <Pressable style={styles.newEnvironmentTab}>
          <Text style={styles.newEnvironmentTabText}>+ Novo</Text>
        </Pressable>
      </View>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Mesas do ambiente</Text>
        <View style={styles.tableGrid}>
          <View style={styles.tableItem}>
            <Text style={styles.tableNumber}>Mesa 01</Text>
            <Text style={styles.tableMeta}>4 lugares • quadrada</Text>
          </View>
          <View style={styles.tableItem}>
            <Text style={styles.tableNumber}>Mesa 02</Text>
            <Text style={styles.tableMeta}>6 lugares • retangular</Text>
          </View>
          <View style={styles.tableItem}>
            <Text style={styles.tableNumber}>Mesa 03</Text>
            <Text style={styles.tableMeta}>2 lugares • redonda</Text>
          </View>
        </View>
      </Card>

      <FormSection
        title="Formulario de ambiente"
        description="Composicao fiel para revisar espacamento, hierarchy e acoes da tela real"
      >
        <FieldRow label="Nome do ambiente" required>
          <Input value={environmentName} onChangeText={setEnvironmentName} placeholder="Ex: Salao Principal" />
        </FieldRow>
        <View style={styles.actionsRow}>
          <Button label="Salvar ambiente" onPress={() => undefined} variant="primary" />
          <Button label="Cancelar" onPress={() => undefined} variant="ghost" />
        </View>
      </FormSection>

      <FormSection title="Formulario de mesa" description="Campos centrais para cadastro e edicao de mesas">
        <FieldRow label="Numero da mesa" required>
          <Input value={tableNumber} onChangeText={setTableNumber} placeholder="Ex: 12" keyboardType="number-pad" />
        </FieldRow>
        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <FieldRow label="Lugares" required>
              <Input value={tableSeats} onChangeText={setTableSeats} placeholder="4" keyboardType="number-pad" />
            </FieldRow>
          </View>
          <View style={styles.splitItem}>
            <FieldRow label="Formato" required>
              <Select
                value={tableShape}
                onSelect={setTableShape}
                options={[
                  { label: 'Quadrada', value: 'square' },
                  { label: 'Redonda', value: 'round' },
                  { label: 'Retangular', value: 'rect' },
                ]}
              />
            </FieldRow>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Button label="Salvar mesa" onPress={() => undefined} variant="primary" />
          <Button label="Editar layout" onPress={() => undefined} variant="secondary" />
          <Button label="Excluir" onPress={() => undefined} variant="danger" />
        </View>
      </FormSection>
    </FormPreviewShell>
  );
}

function ConfiguracaoEstoqueLayoutPreview() {
  const iconOptions = ['📦', '🥤', '🛒', '🥩', '🥬', '🧹', '🍺', '🍽️'];
  const [categoryName, setCategoryName] = useState('Descartaveis');
  const [selectedIcon, setSelectedIcon] = useState('📦');

  return (
    <FormPreviewShell
      title="Categorias de Estoque"
      subtitle="Preview real de formulario para configuracao e manutencao de categorias"
    >
      <FormSection title="Nova categoria" description="Area de criacao/edicao com os mesmos blocos visuais da tela real">
        <FieldRow label="Nome da categoria" required>
          <Input value={categoryName} onChangeText={setCategoryName} placeholder="Ex: Limpeza" />
        </FieldRow>

        <FieldRow label="Icone" required>
          <View style={styles.iconRow}>
            {iconOptions.map((icon) => {
              const active = icon === selectedIcon;
              return (
                <Pressable
                  key={icon}
                  onPress={() => setSelectedIcon(icon)}
                  style={[styles.iconChip, active && styles.iconChipActive]}
                >
                  <Text style={styles.iconChipText}>{icon}</Text>
                </Pressable>
              );
            })}
          </View>
        </FieldRow>

        <View style={styles.actionsRow}>
          <Button label="Salvar categoria" onPress={() => undefined} variant="primary" />
          <Button label="Limpar" onPress={() => undefined} variant="ghost" />
        </View>
      </FormSection>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Categorias ativas (4)</Text>
        <View style={styles.categoryItem}>
          <Text style={styles.categoryName}>📦 Descartaveis</Text>
          <View style={styles.inlineActions}>
            <Button label="Editar" onPress={() => undefined} variant="secondary" size="sm" />
            <Button label="Remover" onPress={() => undefined} variant="danger" size="sm" />
          </View>
        </View>
        <View style={styles.categoryItem}>
          <Text style={styles.categoryName}>🥩 Carnes</Text>
          <View style={styles.inlineActions}>
            <Button label="Editar" onPress={() => undefined} variant="secondary" size="sm" />
            <Button label="Remover" onPress={() => undefined} variant="danger" size="sm" />
          </View>
        </View>
      </Card>
    </FormPreviewShell>
  );
}

function OperationalSettingsLayoutPreview() {
  const [cutoffHour, setCutoffHour] = useState('06');

  return (
    <FormPreviewShell
      title="Configuracoes Operacionais"
      subtitle="Preview real da secao de turno de trabalho e horario de corte"
    >
      <FormSection title="Turno de Trabalho" description="Ajusta quando o dia de negocio passa a ser contabilizado">
        <FieldRow label="Horario de corte (00-23)" required helper="Pedidos antes desse horario contam para o dia anterior.">
          <View style={styles.timeInputRow}>
            <Input
              value={cutoffHour}
              onChangeText={setCutoffHour}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="06"
              containerStyle={styles.timeInput}
            />
            <Text style={styles.timeSuffix}>:00</Text>
          </View>
        </FieldRow>
      </FormSection>

      <View style={styles.saveRow}>
        <Button label="SALVAR CONFIGURACOES" onPress={() => undefined} variant="primary" fullWidth />
      </View>
    </FormPreviewShell>
  );
}

function ConfiguracoesLayoutPreview() {
  const [profileName, setProfileName] = useState('Ana Oliveira');
  const [profilePhone, setProfilePhone] = useState('(83) 99999-1234');
  const [memberEmail, setMemberEmail] = useState('novo.usuario@empresa.com');
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifFinancial, setNotifFinancial] = useState(true);
  const [notifTeam, setNotifTeam] = useState(false);

  return (
    <FormPreviewShell
      title="Configuracoes"
      subtitle="Preview real de perfil, notificacoes e equipe"
    >
      <FormSection title="Meu Perfil" description="Atualize dados pessoais usados no painel administrativo">
        <FieldRow label="Email" helper="operador@restaurante.com">
          <Text style={styles.readOnlyText}>operador@restaurante.com</Text>
        </FieldRow>
        <FieldRow label="Nome completo" required>
          <Input value={profileName} onChangeText={setProfileName} placeholder="Seu nome completo" />
        </FieldRow>
        <FieldRow label="Telefone">
          <Input value={profilePhone} onChangeText={setProfilePhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
        </FieldRow>
      </FormSection>

      <FormSection title="Notificacoes" description="Preferencias para avisos da operacao">
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Atualizacoes de pedidos</Text>
          <Switch value={notifOrders} onValueChange={setNotifOrders} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Alertas financeiros</Text>
          <Switch value={notifFinancial} onValueChange={setNotifFinancial} />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Mensagens da equipe</Text>
          <Switch value={notifTeam} onValueChange={setNotifTeam} />
        </View>
      </FormSection>

      <FormSection title="Equipe" description="Convite rapido para novo colaborador">
        <FieldRow label="Email do colaborador" required>
          <Input value={memberEmail} onChangeText={setMemberEmail} placeholder="email@empresa.com" keyboardType="email-address" />
        </FieldRow>
        <View style={styles.actionsRow}>
          <Button label="Adicionar membro" onPress={() => undefined} variant="primary" />
          <Button label="Sair da conta" onPress={() => undefined} variant="danger" />
        </View>
      </FormSection>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Membros cadastrados</Text>
        <View style={styles.listRow}>
          <Text style={styles.listPrimary}>Ana Oliveira</Text>
          <Text style={styles.listSecondary}>Administrador</Text>
        </View>
        <View style={styles.listRow}>
          <Text style={styles.listPrimary}>Carlos Mendes</Text>
          <Text style={styles.listSecondary}>Gerente</Text>
        </View>
      </Card>
    </FormPreviewShell>
  );
}

function EditarEmpresaLayoutPreview() {
  const [restaurantName, setRestaurantName] = useState('Restaurante Bom Sabor');
  const [documentType, setDocumentType] = useState('cnpj');
  const [documentValue, setDocumentValue] = useState('12.345.678/0001-90');
  const [contactName, setContactName] = useState('Mariana Costa');
  const [contactPhone, setContactPhone] = useState('(83) 98888-1111');
  const [zipCode, setZipCode] = useState('58000-000');
  const [address, setAddress] = useState('Av. Central, 120');
  const [city, setCity] = useState('Joao Pessoa');
  const [stateValue, setStateValue] = useState('PB');

  return (
    <FormPreviewShell
      title="Dados da Empresa"
      subtitle="Preview real de formulario cadastral da empresa"
    >
      <FormSection title="Informacoes Basicas" description="Dados principais do estabelecimento">
        <FieldRow label="Nome do restaurante" required>
          <Input value={restaurantName} onChangeText={setRestaurantName} placeholder="Nome do negocio" />
        </FieldRow>
        <FieldRow label="Tipo de documento" required>
          <Select
            value={documentType}
            onSelect={setDocumentType}
            options={[
              { label: 'CPF', value: 'cpf' },
              { label: 'CNPJ', value: 'cnpj' },
            ]}
          />
        </FieldRow>
        <FieldRow label={documentType === 'cpf' ? 'CPF' : 'CNPJ'} required>
          <Input value={documentValue} onChangeText={setDocumentValue} placeholder="Documento" keyboardType="number-pad" />
        </FieldRow>
      </FormSection>

      <FormSection title="Contato" description="Responsavel e telefone principal">
        <FieldRow label="Nome do responsavel">
          <Input value={contactName} onChangeText={setContactName} placeholder="Nome completo" />
        </FieldRow>
        <FieldRow label="Telefone">
          <Input value={contactPhone} onChangeText={setContactPhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
        </FieldRow>
      </FormSection>

      <FormSection title="Endereco" description="Dados de localizacao da empresa">
        <FieldRow label="CEP">
          <Input value={zipCode} onChangeText={setZipCode} placeholder="00000-000" keyboardType="number-pad" />
        </FieldRow>
        <FieldRow label="Endereco completo">
          <Input value={address} onChangeText={setAddress} placeholder="Rua, numero, complemento" />
        </FieldRow>
        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <FieldRow label="Cidade">
              <Input value={city} onChangeText={setCity} placeholder="Cidade" />
            </FieldRow>
          </View>
          <View style={styles.stateInputCol}>
            <FieldRow label="UF">
              <Input value={stateValue} onChangeText={setStateValue} placeholder="UF" maxLength={2} />
            </FieldRow>
          </View>
        </View>
      </FormSection>

      <View style={styles.actionsRow}>
        <Button label="Salvar dados" onPress={() => undefined} variant="primary" />
        <Button label="Voltar" onPress={() => undefined} variant="ghost" />
      </View>
    </FormPreviewShell>
  );
}

function FuncionariosLayoutPreview() {
  const [employeeName, setEmployeeName] = useState('Joao Silva');
  const [employeeCpf, setEmployeeCpf] = useState('123.456.789-00');
  const [employeeEmail, setEmployeeEmail] = useState('joao@empresa.com');
  const [employeePhone, setEmployeePhone] = useState('(83) 99911-2233');
  const [employeeRole, setEmployeeRole] = useState('garcom');

  return (
    <FormPreviewShell
      title="Funcionarios"
      subtitle="Preview real de cadastro/edicao e listagem da equipe"
    >
      <FormSection title="Novo funcionario" description="Formulario principal para cadastro e manutencao">
        <FieldRow label="Nome completo" required>
          <Input value={employeeName} onChangeText={setEmployeeName} placeholder="Ex: Joao Silva" />
        </FieldRow>
        <FieldRow label="CPF" required>
          <Input value={employeeCpf} onChangeText={setEmployeeCpf} placeholder="000.000.000-00" keyboardType="number-pad" />
        </FieldRow>
        <FieldRow label="Email" required>
          <Input value={employeeEmail} onChangeText={setEmployeeEmail} placeholder="email@empresa.com" keyboardType="email-address" />
        </FieldRow>
        <FieldRow label="Telefone">
          <Input value={employeePhone} onChangeText={setEmployeePhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
        </FieldRow>
        <FieldRow label="Funcao" required>
          <Select
            value={employeeRole}
            onSelect={setEmployeeRole}
            options={[
              { label: 'Garcom', value: 'garcom' },
              { label: 'Cozinheiro', value: 'cozinheiro' },
              { label: 'Montagem', value: 'montagem' },
              { label: 'Administrador', value: 'admin' },
            ]}
          />
        </FieldRow>
        <View style={styles.actionsRow}>
          <Button label="Salvar funcionario" onPress={() => undefined} variant="primary" />
          <Button label="Limpar" onPress={() => undefined} variant="ghost" />
        </View>
      </FormSection>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Funcionarios cadastrados</Text>
        <View style={styles.employeeCard}>
          <View style={styles.employeeHeader}>
            <Text style={styles.listPrimary}>Joao Silva</Text>
            <Text style={styles.roleBadge}>Garcom</Text>
          </View>
          <Text style={styles.listSecondary}>CPF: 123.456.789-00</Text>
          <Text style={styles.listSecondary}>Email: joao@empresa.com</Text>
          <View style={styles.inlineActions}>
            <Button label="Editar" onPress={() => undefined} variant="secondary" size="sm" />
            <Button label="Excluir" onPress={() => undefined} variant="danger" size="sm" />
          </View>
        </View>
      </Card>
    </FormPreviewShell>
  );
}

function CadastroProdutoLayoutPreview() {
  const [productName, setProductName] = useState('Espetinho Misto');
  const [productPrice, setProductPrice] = useState('18.90');
  const [productCategory, setProductCategory] = useState('espetinho');

  return (
    <FormPreviewShell
      title="Cadastro de Produtos"
      subtitle="Preview real de formulario rapido para novos itens"
    >
      <FormSection title="Dados do produto" description="Campos centrais de cadastro com escolha de categoria">
        <FieldRow label="Nome do produto" required>
          <Input value={productName} onChangeText={setProductName} placeholder="Ex: Picanha" />
        </FieldRow>
        <FieldRow label="Preco (R$)" required>
          <Input value={productPrice} onChangeText={setProductPrice} placeholder="Ex: 12.99" keyboardType="decimal-pad" />
        </FieldRow>
        <FieldRow label="Categoria" required>
          <View style={styles.categoryChipRow}>
            {[
              { label: 'ESPETINHO', value: 'espetinho' },
              { label: 'BEBIDA', value: 'bebida' },
            ].map((item) => {
              const active = productCategory === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setProductCategory(item.value)}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </FieldRow>
      </FormSection>

      <View style={styles.actionsRow}>
        <Button label="CADASTRAR PRODUTO" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function ExtrasConfigLayoutPreview() {
  const [activeTab, setActiveTab] = useState<'borda' | 'adicional'>('borda');
  const [extraName, setExtraName] = useState('Catupiry');
  const [extraPrice, setExtraPrice] = useState('7.00');

  return (
    <FormPreviewShell
      title="Configurar Extras"
      subtitle="Preview real para bordas recheadas e adicionais"
    >
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab('borda')}
          style={[styles.environmentTab, activeTab === 'borda' && styles.environmentTabActive]}
        >
          <Text style={[styles.environmentTabText, activeTab === 'borda' && styles.environmentTabTextActive]}>Bordas Recheadas</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('adicional')}
          style={[styles.environmentTab, activeTab === 'adicional' && styles.environmentTabActive]}
        >
          <Text style={[styles.environmentTabText, activeTab === 'adicional' && styles.environmentTabTextActive]}>Adicionais</Text>
        </Pressable>
      </View>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{activeTab === 'borda' ? 'Bordas cadastradas' : 'Adicionais cadastrados'}</Text>
        <View style={styles.listRowWithActions}>
          <View>
            <Text style={styles.listPrimary}>Catupiry</Text>
            <Text style={styles.listSecondary}>R$ 7,00</Text>
          </View>
          <View style={styles.inlineActions}>
            <Button label="Editar" onPress={() => undefined} variant="secondary" size="sm" />
            <Button label="Excluir" onPress={() => undefined} variant="danger" size="sm" />
          </View>
        </View>
      </Card>

      <FormSection title="Adicionar / Editar extra" description="Composicao visual equivalente ao modal da tela real">
        <FieldRow label="Nome" required>
          <Input value={extraName} onChangeText={setExtraName} placeholder="Ex: Catupiry, Cheddar, Bacon" />
        </FieldRow>
        <FieldRow label="Preco (R$)" required>
          <Input value={extraPrice} onChangeText={setExtraPrice} placeholder="0.00" keyboardType="decimal-pad" />
        </FieldRow>
        <View style={styles.actionsRow}>
          <Button label="Cancelar" onPress={() => undefined} variant="ghost" />
          <Button label="Salvar" onPress={() => undefined} variant="primary" />
        </View>
      </FormSection>
    </FormPreviewShell>
  );
}

function GerenciarFornecedoresLayoutPreview() {
  const [supplierName, setSupplierName] = useState('Distribuidora Nordeste');
  const [supplierCnpj, setSupplierCnpj] = useState('12.345.678/0001-90');
  const [supplierPhone, setSupplierPhone] = useState('(83) 9 9999-8888');
  const [supplierEmail, setSupplierEmail] = useState('contato@fornecedor.com');

  return (
    <FormPreviewShell
      title="Fornecedores"
      subtitle="Preview real de cadastro e listagem de fornecedores"
    >
      <FormSection title="Novo fornecedor" description="Formulario administrativo com validacoes de CNPJ, telefone e email">
        <FieldRow label="Nome da empresa" required>
          <Input value={supplierName} onChangeText={setSupplierName} placeholder="Nome da empresa" />
        </FieldRow>
        <FieldRow label="CNPJ">
          <Input value={supplierCnpj} onChangeText={setSupplierCnpj} placeholder="00.000.000/0000-00" keyboardType="number-pad" />
        </FieldRow>
        <FieldRow label="Celular">
          <Input value={supplierPhone} onChangeText={setSupplierPhone} placeholder="(00) 0 0000-0000" keyboardType="phone-pad" />
        </FieldRow>
        <FieldRow label="Email">
          <Input value={supplierEmail} onChangeText={setSupplierEmail} placeholder="email@fornecedor.com" keyboardType="email-address" />
        </FieldRow>
        <View style={styles.actionsRow}>
          <Button label="Cancelar" onPress={() => undefined} variant="ghost" />
          <Button label="Salvar" onPress={() => undefined} variant="primary" />
        </View>
      </FormSection>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Fornecedores cadastrados</Text>
        <View style={styles.listRowWithActions}>
          <View style={styles.listGrow}>
            <Text style={styles.listPrimary}>Distribuidora Nordeste</Text>
            <Text style={styles.listSecondary}>CNPJ: 12.345.678/0001-90</Text>
            <Text style={styles.listSecondary}>Tel: (83) 9 9999-8888</Text>
            <Text style={styles.listSecondary}>Email: contato@fornecedor.com</Text>
          </View>
          <View style={styles.inlineActions}>
            <Button label="Editar" onPress={() => undefined} variant="secondary" size="sm" />
            <Button label="Excluir" onPress={() => undefined} variant="danger" size="sm" />
          </View>
        </View>
      </Card>
    </FormPreviewShell>
  );
}

function LoginLayoutPreview() {
  return (
    <FormPreviewShell title="Login" subtitle="Preview real do formulario de autenticacao">
      <FormSection title="Acesso" description="Entre com suas credenciais para abrir o painel">
        <FieldRow label="Email" required>
          <Input value="admin@restaurante.com" onChangeText={() => undefined} placeholder="email@empresa.com" keyboardType="email-address" />
        </FieldRow>
        <FieldRow label="Senha" required>
          <Input value="" onChangeText={() => undefined} placeholder="••••••••" secureTextEntry />
        </FieldRow>
        <View style={styles.actionsRow}>
          <Button label="Entrar" onPress={() => undefined} variant="primary" />
          <Button label="Esqueci a senha" onPress={() => undefined} variant="ghost" />
        </View>
      </FormSection>
    </FormPreviewShell>
  );
}

function RegisterCompanyLayoutPreview() {
  return (
    <FormPreviewShell title="Registrar Empresa" subtitle="Preview real do onboarding inicial da empresa">
      <FormSection title="Dados da empresa" description="Informacoes basicas para criar a conta corporativa">
        <FieldRow label="Nome da empresa" required>
          <Input value="Restaurante Bom Sabor" onChangeText={() => undefined} placeholder="Nome fantasia" />
        </FieldRow>
        <FieldRow label="CNPJ" required>
          <Input value="12.345.678/0001-90" onChangeText={() => undefined} placeholder="00.000.000/0000-00" keyboardType="number-pad" />
        </FieldRow>
        <FieldRow label="Email do administrador" required>
          <Input value="admin@restaurante.com" onChangeText={() => undefined} placeholder="email@empresa.com" keyboardType="email-address" />
        </FieldRow>
        <FieldRow label="Senha" required>
          <Input value="" onChangeText={() => undefined} placeholder="Crie uma senha" secureTextEntry />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Criar conta" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function ResetPasswordLayoutPreview() {
  return (
    <FormPreviewShell title="Recuperar Senha" subtitle="Preview real do fluxo de redefinicao de senha">
      <FormSection title="Recuperacao" description="Informe o email para receber o link de redefinicao">
        <FieldRow label="Email" required>
          <Input value="admin@restaurante.com" onChangeText={() => undefined} placeholder="email@empresa.com" keyboardType="email-address" />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Enviar link" onPress={() => undefined} variant="primary" />
        <Button label="Voltar ao login" onPress={() => undefined} variant="ghost" />
      </View>
    </FormPreviewShell>
  );
}

function BillingLayoutPreview() {
  return (
    <FormPreviewShell title="Assinatura SaaS" subtitle="Preview real de faturamento e metodo de pagamento">
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Plano atual</Text>
        <Text style={styles.listPrimary}>Plano Profissional</Text>
        <Text style={styles.listSecondary}>R$ 149,90 / mes • Proxima cobranca em 05/05/2026</Text>
      </Card>
      <FormSection title="Metodo de pagamento" description="Atualize os dados do cartao principal">
        <FieldRow label="Nome no cartao" required>
          <Input value="ANA OLIVEIRA" onChangeText={() => undefined} placeholder="Nome impresso" />
        </FieldRow>
        <FieldRow label="Numero do cartao" required>
          <Input value="**** **** **** 4242" onChangeText={() => undefined} placeholder="0000 0000 0000 0000" keyboardType="number-pad" />
        </FieldRow>
        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <FieldRow label="Validade" required>
              <Input value="12/28" onChangeText={() => undefined} placeholder="MM/AA" />
            </FieldRow>
          </View>
          <View style={styles.stateInputCol}>
            <FieldRow label="CVV" required>
              <Input value="***" onChangeText={() => undefined} placeholder="123" keyboardType="number-pad" />
            </FieldRow>
          </View>
        </View>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Salvar pagamento" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function CaixaAberturaLayoutPreview() {
  return (
    <FormPreviewShell title="Abertura de Caixa" subtitle="Preview real do formulario de abertura de turno">
      <FormSection title="Dados da abertura" description="Registre o valor inicial antes de iniciar operacao">
        <FieldRow label="Valor inicial" required>
          <Input value="300.00" onChangeText={() => undefined} keyboardType="decimal-pad" placeholder="0.00" />
        </FieldRow>
        <FieldRow label="Observacoes">
          <Input value="Troco inicial separado no cofre." onChangeText={() => undefined} placeholder="Observacoes opcionais" />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Abrir caixa" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function CaixaFechamentoLayoutPreview() {
  return (
    <FormPreviewShell title="Fechamento de Caixa" subtitle="Preview real da conciliacao de fechamento">
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Resumo do turno</Text>
        <Text style={styles.listSecondary}>Total em vendas: R$ 2.430,00</Text>
        <Text style={styles.listSecondary}>Total em dinheiro: R$ 980,00</Text>
      </Card>
      <FormSection title="Conferencia" description="Informe os valores reais para conciliacao final">
        <FieldRow label="Dinheiro em caixa" required>
          <Input value="980.00" onChangeText={() => undefined} keyboardType="decimal-pad" placeholder="0.00" />
        </FieldRow>
        <FieldRow label="Observacoes">
          <Input value="Sem divergencias relevantes." onChangeText={() => undefined} placeholder="Observacoes do fechamento" />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Finalizar fechamento" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function CaixaOperacoesLayoutPreview() {
  return (
    <FormPreviewShell title="Operacoes de Caixa" subtitle="Preview real de sangria/suprimento">
      <FormSection title="Nova operacao" description="Registre movimentacoes operacionais durante o turno">
        <FieldRow label="Tipo" required>
          <Select
            value="sangria"
            onSelect={() => undefined}
            options={[
              { label: 'Sangria', value: 'sangria' },
              { label: 'Suprimento', value: 'suprimento' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Valor" required>
          <Input value="50.00" onChangeText={() => undefined} keyboardType="decimal-pad" placeholder="0.00" />
        </FieldRow>
        <FieldRow label="Motivo">
          <Input value="Retirada para cofre." onChangeText={() => undefined} placeholder="Descreva o motivo" />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Registrar operacao" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function EstoqueLayoutPreview() {
  return (
    <FormPreviewShell title="Estoque" subtitle="Preview real de ajuste e movimentacao de itens">
      <FormSection title="Ajuste de item" description="Atualize quantidade e unidade do item selecionado">
        <FieldRow label="Item" required>
          <Input value="Queijo Mussarela" onChangeText={() => undefined} placeholder="Nome do item" />
        </FieldRow>
        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <FieldRow label="Quantidade" required>
              <Input value="12" onChangeText={() => undefined} keyboardType="number-pad" />
            </FieldRow>
          </View>
          <View style={styles.stateInputCol}>
            <FieldRow label="Unidade" required>
              <Input value="kg" onChangeText={() => undefined} />
            </FieldRow>
          </View>
        </View>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Salvar ajuste" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function GerenciarCardapioLayoutPreview() {
  return (
    <FormPreviewShell title="Gerenciar Cardapio" subtitle="Preview real de cadastro e filtros de produtos">
      <FormSection title="Filtro de listagem" description="Controle visual de categoria e pesquisa">
        <FieldRow label="Categoria">
          <Select
            value="comidas"
            onSelect={() => undefined}
            options={[
              { label: 'Comidas', value: 'comidas' },
              { label: 'Pizzas', value: 'pizzas' },
              { label: 'Bebidas', value: 'bebidas' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Busca">
          <Input value="" onChangeText={() => undefined} placeholder="Buscar produto" />
        </FieldRow>
      </FormSection>
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Produtos</Text>
        <View style={styles.listRowWithActions}>
          <Text style={styles.listPrimary}>Pizza Calabresa</Text>
          <View style={styles.inlineActions}>
            <Button label="Editar" onPress={() => undefined} variant="secondary" size="sm" />
            <Button label="Ativar" onPress={() => undefined} variant="ghost" size="sm" />
          </View>
        </View>
      </Card>
    </FormPreviewShell>
  );
}

function PedidoDetalhesLayoutPreview() {
  return (
    <FormPreviewShell title="Detalhes do Pedido" subtitle="Preview real do modal de detalhamento do pedido">
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pedido #1042</Text>
        <Text style={styles.listSecondary}>Cliente: Maria Souza • Mesa 12</Text>
      </Card>
      <FormSection title="Atualizacao rapida" description="Campos e acoes frequentes do modal operacional">
        <FieldRow label="Status">
          <Select
            value="preparando"
            onSelect={() => undefined}
            options={[
              { label: 'Recebido', value: 'recebido' },
              { label: 'Preparando', value: 'preparando' },
              { label: 'Pronto', value: 'pronto' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Observacao da cozinha">
          <Input value="Sem cebola" onChangeText={() => undefined} placeholder="Observacao interna" />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Salvar" onPress={() => undefined} variant="primary" />
        <Button label="Cancelar pedido" onPress={() => undefined} variant="danger" />
      </View>
    </FormPreviewShell>
  );
}

function NovoPedidoLayoutPreview() {
  return (
    <FormPreviewShell title="Novo Pedido" subtitle="Preview real de abertura de pedido no balcao/mesa">
      <FormSection title="Dados iniciais" description="Identificacao do atendimento e canal do pedido">
        <FieldRow label="Tipo de atendimento" required>
          <Select
            value="mesa"
            onSelect={() => undefined}
            options={[
              { label: 'Mesa', value: 'mesa' },
              { label: 'Balcao', value: 'balcao' },
              { label: 'Delivery', value: 'delivery' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Cliente">
          <Input value="Maria Souza" onChangeText={() => undefined} placeholder="Nome do cliente" />
        </FieldRow>
      </FormSection>
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Itens adicionados</Text>
        <Text style={styles.listSecondary}>Pizza Frango com Catupiry • R$ 52,00</Text>
      </Card>
      <View style={styles.actionsRow}>
        <Button label="Adicionar item" onPress={() => undefined} variant="secondary" />
        <Button label="Salvar pedido" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function PublicMenuLayoutPreview() {
  return (
    <FormPreviewShell title="Cardapio Publico" subtitle="Preview real de filtros e formulario de contato do menu publico">
      <FormSection title="Busca" description="Controles de pesquisa e categoria do cardapio publico">
        <FieldRow label="Pesquisar">
          <Input value="" onChangeText={() => undefined} placeholder="Buscar item" />
        </FieldRow>
        <FieldRow label="Categoria">
          <Select
            value="todos"
            onSelect={() => undefined}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: 'Pizzas', value: 'pizzas' },
              { label: 'Bebidas', value: 'bebidas' },
            ]}
          />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Atualizar lista" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function ReservasLayoutPreview() {
  return (
    <FormPreviewShell title="Reservas" subtitle="Preview real de criacao e edicao de reserva">
      <FormSection title="Nova reserva" description="Formulario de agendamento para clientes">
        <FieldRow label="Nome do cliente" required>
          <Input value="Carlos Lima" onChangeText={() => undefined} placeholder="Nome completo" />
        </FieldRow>
        <FieldRow label="Telefone" required>
          <Input value="(83) 99888-1122" onChangeText={() => undefined} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
        </FieldRow>
        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <FieldRow label="Data" required>
              <Input value="20/04/2026" onChangeText={() => undefined} placeholder="DD/MM/AAAA" />
            </FieldRow>
          </View>
          <View style={styles.stateInputCol}>
            <FieldRow label="Hora" required>
              <Input value="20:00" onChangeText={() => undefined} placeholder="HH:MM" />
            </FieldRow>
          </View>
        </View>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Salvar reserva" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function DeliveryLayoutPreview() {
  return (
    <FormPreviewShell title="Delivery" subtitle="Preview real de dados de entrega e despacho">
      <FormSection title="Endereco de entrega" description="Campos centrais para roteirizacao do pedido">
        <FieldRow label="Cliente" required>
          <Input value="Patricia Nunes" onChangeText={() => undefined} placeholder="Nome do cliente" />
        </FieldRow>
        <FieldRow label="Endereco" required>
          <Input value="Rua das Flores, 90" onChangeText={() => undefined} placeholder="Rua e numero" />
        </FieldRow>
        <FieldRow label="Bairro" required>
          <Input value="Centro" onChangeText={() => undefined} placeholder="Bairro" />
        </FieldRow>
        <FieldRow label="Entregador">
          <Select
            value="entregador-1"
            onSelect={() => undefined}
            options={[
              { label: 'Joao - Moto 1', value: 'entregador-1' },
              { label: 'Marcos - Moto 2', value: 'entregador-2' },
            ]}
          />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Despachar" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function DeliveryOcorrenciasLayoutPreview() {
  return (
    <FormPreviewShell title="Ocorrencias Delivery" subtitle="Preview real de registro de ocorrencias da entrega">
      <FormSection title="Nova ocorrencia" description="Registro de incidentes para auditoria e suporte">
        <FieldRow label="Pedido" required>
          <Input value="#1042" onChangeText={() => undefined} placeholder="Numero do pedido" />
        </FieldRow>
        <FieldRow label="Tipo" required>
          <Select
            value="atraso"
            onSelect={() => undefined}
            options={[
              { label: 'Atraso', value: 'atraso' },
              { label: 'Endereco incorreto', value: 'endereco' },
              { label: 'Cliente ausente', value: 'ausente' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Descricao" required>
          <Input value="Cliente solicitou novo horario de entrega." onChangeText={() => undefined} placeholder="Descreva a ocorrencia" />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Registrar" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function AdicionaisConfigModalLayoutPreview() {
  return (
    <FormPreviewShell title="Configurar Adicionais" subtitle="Preview real do modal de adicionais do produto">
      <FormSection title="Adicionar opcao" description="Cadastro de adicional com preco e tipo de selecao">
        <FieldRow label="Nome" required>
          <Input value="Bacon extra" onChangeText={() => undefined} placeholder="Nome do adicional" />
        </FieldRow>
        <FieldRow label="Preco" required>
          <Input value="6.00" onChangeText={() => undefined} keyboardType="decimal-pad" placeholder="0.00" />
        </FieldRow>
        <FieldRow label="Tipo de selecao" required>
          <Select
            value="multiplo"
            onSelect={() => undefined}
            options={[
              { label: 'Unico', value: 'unico' },
              { label: 'Multiplo', value: 'multiplo' },
            ]}
          />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Salvar adicional" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function MenuSettingsLayoutPreview() {
  return (
    <FormPreviewShell title="Configuracoes de Menu" subtitle="Preview real de parametros globais do cardapio">
      <FormSection title="Parametros" description="Controle de categorias e comportamento do menu">
        <FieldRow label="Categoria padrao">
          <Select
            value="comidas"
            onSelect={() => undefined}
            options={[
              { label: 'Comidas', value: 'comidas' },
              { label: 'Pizzas', value: 'pizzas' },
              { label: 'Bebidas', value: 'bebidas' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Mensagem de destaque">
          <Input value="Novidades da semana" onChangeText={() => undefined} placeholder="Texto de destaque" />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Salvar configuracoes" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function ProductFormLayoutPreview() {
  return (
    <FormPreviewShell title="Formulario de Produto" subtitle="Preview real do modal completo de produto">
      <FormSection title="Dados principais" description="Campos usados no cadastro completo de itens">
        <FieldRow label="Nome" required>
          <Input value="Pizza Frango" onChangeText={() => undefined} placeholder="Nome do produto" />
        </FieldRow>
        <FieldRow label="Categoria" required>
          <Select
            value="pizzas"
            onSelect={() => undefined}
            options={[
              { label: 'Pizzas', value: 'pizzas' },
              { label: 'Comidas', value: 'comidas' },
            ]}
          />
        </FieldRow>
        <FieldRow label="Preco base" required>
          <Input value="49.90" onChangeText={() => undefined} keyboardType="decimal-pad" placeholder="0.00" />
        </FieldRow>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Salvar produto" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function StockManagerLayoutPreview() {
  return (
    <FormPreviewShell title="Gerenciar Estoque do Produto" subtitle="Preview real da ficha tecnica do item">
      <FormSection title="Ingrediente" description="Vinculo de insumo e quantidade por produto">
        <FieldRow label="Insumo" required>
          <Input value="Queijo Mussarela" onChangeText={() => undefined} placeholder="Selecione o insumo" />
        </FieldRow>
        <View style={styles.splitRow}>
          <View style={styles.splitItem}>
            <FieldRow label="Quantidade" required>
              <Input value="0.25" onChangeText={() => undefined} keyboardType="decimal-pad" />
            </FieldRow>
          </View>
          <View style={styles.stateInputCol}>
            <FieldRow label="Unidade" required>
              <Input value="kg" onChangeText={() => undefined} />
            </FieldRow>
          </View>
        </View>
      </FormSection>
      <View style={styles.actionsRow}>
        <Button label="Adicionar ingrediente" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

function VariationManagerLayoutPreview() {
  return (
    <FormPreviewShell title="Gerenciar Variacoes" subtitle="Preview real da gestao de variacoes por produto">
      <FormSection title="Nova variacao" description="Cadastro de nome e preco de variacao">
        <FieldRow label="Nome da variacao" required>
          <Input value="Tamanho Grande" onChangeText={() => undefined} placeholder="Nome da variacao" />
        </FieldRow>
        <FieldRow label="Preco" required>
          <Input value="59.90" onChangeText={() => undefined} keyboardType="decimal-pad" placeholder="0.00" />
        </FieldRow>
      </FormSection>
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Variacoes existentes</Text>
        <View style={styles.listRowWithActions}>
          <Text style={styles.listPrimary}>Tamanho Medio • R$ 49,90</Text>
          <View style={styles.inlineActions}>
            <Button label="Editar" onPress={() => undefined} variant="secondary" size="sm" />
            <Button label="Remover" onPress={() => undefined} variant="danger" size="sm" />
          </View>
        </View>
      </Card>
      <View style={styles.actionsRow}>
        <Button label="Salvar variacoes" onPress={() => undefined} variant="primary" />
      </View>
    </FormPreviewShell>
  );
}

const meta: Meta<typeof FormPreviewShell> = {
  title: 'Forms/RestauranteWeb/RealPreviews',
  component: FormPreviewShell,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof FormPreviewShell>;

export const ConfiguracaoMesasScreen: Story = {
  render: () => <ConfiguracaoMesasLayoutPreview />,
};

export const ConfiguracaoEstoqueScreen: Story = {
  render: () => <ConfiguracaoEstoqueLayoutPreview />,
};

export const OperationalSettingsScreen: Story = {
  render: () => <OperationalSettingsLayoutPreview />,
};

export const ConfiguracoesScreen: Story = {
  render: () => <ConfiguracoesLayoutPreview />,
};

export const EditarEmpresaScreen: Story = {
  render: () => <EditarEmpresaLayoutPreview />,
};

export const FuncionariosScreen: Story = {
  render: () => <FuncionariosLayoutPreview />,
};

export const CadastroProdutoScreen: Story = {
  render: () => <CadastroProdutoLayoutPreview />,
};

export const ExtrasConfigScreen: Story = {
  render: () => <ExtrasConfigLayoutPreview />,
};

export const GerenciarFornecedoresScreen: Story = {
  render: () => <GerenciarFornecedoresLayoutPreview />,
};

export const LoginScreen: Story = {
  render: () => <LoginLayoutPreview />,
};

export const RegisterCompanyScreen: Story = {
  render: () => <RegisterCompanyLayoutPreview />,
};

export const ResetPasswordScreen: Story = {
  render: () => <ResetPasswordLayoutPreview />,
};

export const BillingScreen: Story = {
  render: () => <BillingLayoutPreview />,
};

export const CaixaAberturaScreen: Story = {
  render: () => <CaixaAberturaLayoutPreview />,
};

export const CaixaFechamentoScreen: Story = {
  render: () => <CaixaFechamentoLayoutPreview />,
};

export const CaixaOperacoesScreen: Story = {
  render: () => <CaixaOperacoesLayoutPreview />,
};

export const EstoqueScreen: Story = {
  render: () => <EstoqueLayoutPreview />,
};

export const GerenciarCardapioScreen: Story = {
  render: () => <GerenciarCardapioLayoutPreview />,
};

export const PedidoDetalhesModal: Story = {
  render: () => <PedidoDetalhesLayoutPreview />,
};

export const NovoPedidoScreen: Story = {
  render: () => <NovoPedidoLayoutPreview />,
};

export const PublicMenuScreen: Story = {
  render: () => <PublicMenuLayoutPreview />,
};

export const ReservasScreen: Story = {
  render: () => <ReservasLayoutPreview />,
};

export const DeliveryScreen: Story = {
  render: () => <DeliveryLayoutPreview />,
};

export const DeliveryOcorrenciasScreen: Story = {
  render: () => <DeliveryOcorrenciasLayoutPreview />,
};

export const AdicionaisConfigModal: Story = {
  render: () => <AdicionaisConfigModalLayoutPreview />,
};

export const MenuSettings: Story = {
  render: () => <MenuSettingsLayoutPreview />,
};

export const ProductForm: Story = {
  render: () => <ProductFormLayoutPreview />,
};

export const StockManager: Story = {
  render: () => <StockManagerLayoutPreview />,
};

export const VariationManager: Story = {
  render: () => <VariationManagerLayoutPreview />,
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing[5],
    gap: spacing[4],
    maxWidth: 980,
    width: '100%',
    alignSelf: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  environmentTab: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  environmentTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  environmentTabText: {
    color: colors.textSecondary,
    ...typography.small,
  },
  environmentTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  newEnvironmentTab: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  newEnvironmentTabText: {
    color: colors.primary,
    ...typography.small,
    fontWeight: '700',
  },
  sectionCard: {
    gap: spacing[3],
  },
  sectionTitle: {
    color: colors.text,
    ...typography.headingM,
  },
  tableGrid: {
    gap: spacing[2],
  },
  tableItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing[3],
    backgroundColor: colors.white,
  },
  tableNumber: {
    color: colors.text,
    ...typography.body,
    fontWeight: '700',
  },
  tableMeta: {
    color: colors.textSecondary,
    ...typography.small,
  },
  splitRow: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
  },
  splitItem: {
    flex: 1,
    minWidth: 220,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  iconChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  iconChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  iconChipText: {
    fontSize: 20,
    lineHeight: 24,
  },
  categoryItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  categoryName: {
    color: colors.text,
    ...typography.body,
    fontWeight: '700',
  },
  inlineActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  readOnlyText: {
    color: colors.textSecondary,
    ...typography.body,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[2],
  },
  switchLabel: {
    color: colors.text,
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  listRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[2],
    gap: 2,
  },
  listPrimary: {
    color: colors.text,
    ...typography.body,
    fontWeight: '700',
  },
  listSecondary: {
    color: colors.textSecondary,
    ...typography.small,
  },
  listGrow: {
    flex: 1,
  },
  listRowWithActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[2],
    gap: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  categoryChipRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  categoryChip: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  categoryChipActive: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },
  categoryChipText: {
    color: colors.textSecondary,
    ...typography.small,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: colors.text,
  },
  stateInputCol: {
    width: 120,
  },
  employeeCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
    gap: spacing[2],
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  roleBadge: {
    color: colors.white,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    ...typography.small,
    fontWeight: '700',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  timeInput: {
    width: 88,
    textAlign: 'center',
  },
  timeSuffix: {
    color: colors.textSecondary,
    ...typography.body,
    fontWeight: '700',
  },
  saveRow: {
    width: '100%',
  },
});