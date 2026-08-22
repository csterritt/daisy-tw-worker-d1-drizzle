/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test'
import { getTableConfig } from 'drizzle-orm/sqlite-core'

import { account } from '../src/db/schema'

describe('Better Auth account schema', () => {
  it('scopes account identities by a required issuer', () => {
    const config = getTableConfig(account)
    const issuer = config.columns.find((column) => column.name === 'issuer')

    expect(issuer?.notNull).toBe(true)
  })

  it('uniquely indexes issuer and account ID together', () => {
    const config = getTableConfig(account)
    const identityIndex = config.indexes.find(
      (index) => index.config.name === 'account_issuer_accountId_uidx',
    )

    expect(identityIndex?.config.unique).toBe(true)
    expect(
      identityIndex?.config.columns.map((column) => ('name' in column ? column.name : null)),
    ).toEqual(['issuer', 'accountId'])
  })
})

describe('Better Auth 1.7 account migration', () => {
  it('backfills credential issuers before enforcing the constraint', async () => {
    const migration = await Bun.file(
      new URL('../drizzle/0003_panoramic_swarm.sql', import.meta.url),
    ).text()

    expect(migration).toContain('CREATE TABLE `__new_account`')
    expect(migration).toContain("CASE WHEN `providerId` = 'credential' THEN 'local:credential' END")
    expect(migration).toContain(
      "CASE WHEN `providerId` = 'credential' THEN `userId` ELSE `accountId` END",
    )
  })

  it('keeps the production bootstrap schema aligned', async () => {
    const productionSchema = await Bun.file(
      new URL('../schema-prod.sql', import.meta.url),
    ).text()

    expect(productionSchema).toContain('`issuer` text NOT NULL')
    expect(productionSchema).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS `account_issuer_accountId_uidx`',
    )
  })
})
