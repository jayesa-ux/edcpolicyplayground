/*******************************************************************************
 * Copyright (c) 2023 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)
 * Copyright (c) 2023 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ******************************************************************************/

import {
  AtomicConstraint,
  LeftOperand,
  LogicalConstraint,
  LogicalOperator,
  Operator,
  Value,
  ValueKind,
} from '../models/policy';

const IN_FORCE = 'inForceDate';
const DATE_EXPRESSION = 'dateExpression';

const TX_BASE_CONTEXT = 'https://w3id.org/tractusx/edc/v0.0.1';
const TX_POLICY_CONTEXT = 'https://w3id.org/tractusx/policy/v1.0.0';
const I3B_POLICY_CONTEXT = 'https://w3id.org/i3b-mvd/policy/';
const EXTERNAL_POLICY_CONTEXT =
  'https://raw.githubusercontent.com/imferna/json-ld-contexts/refs/heads/main/policy.context.jsonld';

const XSD_PREFIX = 'xsd';
const XSD_DATETIME = XSD_PREFIX + ':datetime';

// ==================== EXISTING CONSTRAINTS ====================
export const bpnConstraint = () => {
  return new AtomicConstraint(
    new LeftOperand('businessPartnerNumber'),
    Operator.Eq,
    '<bpnNumber>',
    ValueKind.String,
  ).with_context(TX_BASE_CONTEXT);
};

export const bpnGroupConstraint = () => {
  return new AtomicConstraint(new LeftOperand('BusinessPartnerGroup'), Operator.In, '<group>').with_context(
    TX_BASE_CONTEXT,
  );
};

export const inForceFixedConstraint = () => {
  const constraint = new LogicalConstraint();
  constraint.constraints.push(
    new AtomicConstraint(
      new LeftOperand(IN_FORCE),
      Operator.Gte,
      new Value('2023-01-01T00:00:01Z', XSD_DATETIME),
      ValueKind.Value,
    ).with_prefix(XSD_PREFIX),
  );
  constraint.constraints.push(
    new AtomicConstraint(
      new LeftOperand(IN_FORCE),
      Operator.Lte,
      new Value('2024-01-01T00:00:01Z', XSD_DATETIME),
      ValueKind.Value,
    ).with_prefix(XSD_PREFIX),
  );
  return constraint;
};

export const inForceDurationConstraint = () => {
  const constraint = new LogicalConstraint();
  constraint.constraints.push(
    new AtomicConstraint(
      new LeftOperand(IN_FORCE),
      Operator.Gte,
      new Value('contractAgreement+0s', DATE_EXPRESSION),
      ValueKind.Value,
    ),
  );
  constraint.constraints.push(
    new AtomicConstraint(
      new LeftOperand(IN_FORCE),
      Operator.Lte,
      new Value('contractAgreement+100d', DATE_EXPRESSION),
      ValueKind.Value,
    ),
  );
  return constraint;
};

const fremeworkAgreements = [
  'Pcf',
  'Traceability',
  'Quality',
  'CircularEconomy',
  'DemandCapacity',
  'Puris',
  'BusinessPartner',
  'BehavioralTwin',
];

const frameworkCredentials = fremeworkAgreements.map(frame => {
  return { name: 'FrameworkAgreement', value: `${frame}:<version>`, label: frame };
});

const baseCredentials = [
  { name: 'Membership', value: 'active', label: 'Membership' },
  { name: 'Dismantler', value: 'active', label: 'Dismantler' },
];

const credentials = [...baseCredentials, ...frameworkCredentials];

export const credentialsConstraints = () => {
  return credentials.map(c =>
    new AtomicConstraint(new LeftOperand(c.name), Operator.Eq, c.value)
      .with_context(TX_POLICY_CONTEXT)
      .with_label(c.label),
  );
};

// ==================== DATA PROCESSOR CONSTRAINTS ====================
export const dataProcessorExternalConstraint = () => {
  return new AtomicConstraint(new LeftOperand('DataAccess.level'), Operator.Eq, 'processing', ValueKind.String)
    .with_context(EXTERNAL_POLICY_CONTEXT)
    .with_label('DataProcessor External');
};

export const dataProcessorInternalConstraint = () => {
  return new AtomicConstraint(new LeftOperand('DataAccess.level'), Operator.Eq, 'processing', ValueKind.String)
    .with_context(I3B_POLICY_CONTEXT)
    .with_prefix('i3b-policy')
    .with_label('DataProcessor Internal');
};

// ==================== FIXED DATE AND BPN GROUP CONSTRAINTS ====================
export const fixedDateAndBpnGroupExternalConstraint = () => {
  const constraint = new LogicalConstraint(LogicalOperator.And);

  // Constraint de fecha - usando gt y lt
  constraint.constraints.push(
    new AtomicConstraint(new LeftOperand('inForceDate'), Operator.Gt, '2025-05-01T00:00:01Z', ValueKind.String),
  );
  constraint.constraints.push(
    new AtomicConstraint(new LeftOperand('inForceDate'), Operator.Lt, '2025-06-01T00:00:01Z', ValueKind.String),
  );

  // BPN constraint - usando businessPartnerNumber e isPartOf con array
  constraint.constraints.push(
    new AtomicConstraint(
      new LeftOperand('businessPartnerNumber'),
      Operator.In,
      ['22bbe691-7b10-4688-b49d-8a6800cd9fde', '22bbe691-7b10-4688-b49d-8a6800cd9fd0'],
      ValueKind.String,
    ),
  );

  return constraint;
};

export const fixedDateAndBpnGroupInternalConstraint = () => {
  const constraint = new LogicalConstraint(LogicalOperator.And);

  // Constraint de fecha
  constraint.constraints.push(
    new AtomicConstraint(new LeftOperand('inForceDate'), Operator.Gt, '2025-05-01T00:00:01Z', ValueKind.String),
  );
  constraint.constraints.push(
    new AtomicConstraint(new LeftOperand('inForceDate'), Operator.Lt, '2025-06-01T00:00:01Z', ValueKind.String),
  );

  // BPN constraint para internal context
  constraint.constraints.push(
    new AtomicConstraint(
      new LeftOperand('businessPartnerNumber'),
      Operator.In,
      ['22bbe691-7b10-4688-b49d-8a6800cd9fde', '22bbe691-7b10-4688-b49d-8a6800cd9fd0'],
      ValueKind.String,
    )
      .with_context(I3B_POLICY_CONTEXT)
      .with_prefix('i3b-policy'),
  );

  return constraint;
};

// ==================== MEMBERSHIP CONSTRAINTS ====================
export const membershipExternalConstraint = () => {
  return new AtomicConstraint(new LeftOperand('MembershipCredential'), Operator.Eq, 'active', ValueKind.String)
    .with_context(EXTERNAL_POLICY_CONTEXT)
    .with_label('Membership External');
};

export const membershipInternalConstraint = () => {
  return new AtomicConstraint(new LeftOperand('MembershipCredential'), Operator.Eq, 'active', ValueKind.String)
    .with_context(I3B_POLICY_CONTEXT)
    .with_prefix('i3b-policy')
    .with_label('Membership Internal');
};

// ==================== PERIOD FROM CONTRACT AGREEMENT AND BPN CONSTRAINTS ====================
export const periodFromContractExternalConstraint = () => {
  const constraint = new LogicalConstraint(LogicalOperator.And);

  // Duration constraints con gt/lt
  constraint.constraints.push(
    new AtomicConstraint(new LeftOperand('inForceDate'), Operator.Gt, 'contractAgreement+0s', ValueKind.String),
  );
  constraint.constraints.push(
    new AtomicConstraint(new LeftOperand('inForceDate'), Operator.Lt, 'contractAgreement+30d', ValueKind.String),
  );

  // BPN constraint para external (single value, not array)
  constraint.constraints.push(
    new AtomicConstraint(
      new LeftOperand('businessPartnerNumber'),
      Operator.Eq,
      '22bbe691-7b10-4688-b49d-8a6800cd9fde',
      ValueKind.String,
    ),
  );

  return constraint;
};

export const periodFromContractInternalConstraint = () => {
  const constraint = new LogicalConstraint(LogicalOperator.And);

  // Duration constraints
  constraint.constraints.push(
    new AtomicConstraint(new LeftOperand('inForceDate'), Operator.Gt, 'contractAgreement+0s', ValueKind.String),
  );
  constraint.constraints.push(
    new AtomicConstraint(new LeftOperand('inForceDate'), Operator.Lt, 'contractAgreement+30d', ValueKind.String),
  );

  // BPN constraint para internal
  constraint.constraints.push(
    new AtomicConstraint(
      new LeftOperand('businessPartnerNumber'),
      Operator.Eq,
      '22bbe691-7b10-4688-b49d-8a6800cd9fde',
      ValueKind.String,
    )
      .with_context(I3B_POLICY_CONTEXT)
      .with_prefix('i3b-policy'),
  );

  return constraint;
};
