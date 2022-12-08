/*
Copyright 2018 - 2022 The Alephium Authors
This file is part of the alephium project.

The library is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

The library is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with the library. If not, see <http://www.gnu.org/licenses/>.
*/

import bs58 from './bs58'
import djb2 from '../lib/djb2'
import { AddressKeyPair, deriveNewAddressData } from './wallet'
import { TOTAL_NUMBER_OF_GROUPS } from './constants'
import { ExplorerClient } from './explorer'
import { BIP32Interface } from 'bip32'

export function addressToGroup(address: string, totalNumberOfGroups: number): number {
  const bytes = bs58.decode(address).slice(1)
  const value = djb2(bytes) | 1
  const hash = toPosInt(xorByte(value))
  const group = hash % totalNumberOfGroups

  return group
}

function xorByte(value: number): number {
  const byte0 = value >> 24
  const byte1 = value >> 16
  const byte2 = value >> 8

  return byte0 ^ byte1 ^ byte2 ^ value
}

export const isAddressValid = (address: string) =>
  !!address && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address) && bs58.decode(address).slice(1).length >= 32

const toPosInt = (byte: number): number => byte & 0xff

export const discoverActiveAddresses = async (
  masterKey: BIP32Interface,
  client: ExplorerClient,
  addressIndexesToSkip: number[] = [],
  minGap = 5
): Promise<AddressKeyPair[]> => {
  const addressesPerGroup = Array.from({ length: TOTAL_NUMBER_OF_GROUPS }, (): AddressKeyPair[] => [])
  const activeAddresses: AddressKeyPair[] = []
  const skipIndexes = Array.from(addressIndexesToSkip)

  for (let group = 0; group < TOTAL_NUMBER_OF_GROUPS; group++) {
    const newAddresses = deriveAddressesInGroup(group, minGap, masterKey, skipIndexes)
    addressesPerGroup[group] = newAddresses
    skipIndexes.push(...newAddresses.map((address) => address.index))
  }

  const addressesToCheckIfActive = addressesPerGroup.flat().map((address) => address.hash)
  const results = await getActiveAddressesResults(addressesToCheckIfActive, client)
  const resultsPerGroup = splitResultsArrayIntoOneArrayPerGroup(results, minGap)

  for (let group = 0; group < TOTAL_NUMBER_OF_GROUPS; group++) {
    const { gap, activeAddresses: newActiveAddresses } = getGapFromLastActiveAddress(
      addressesPerGroup[group],
      resultsPerGroup[group]
    )

    let gapPerGroup = gap
    activeAddresses.push(...newActiveAddresses)

    while (gapPerGroup < minGap) {
      const remainingGap = minGap - gapPerGroup
      const newAddresses = deriveAddressesInGroup(group, remainingGap, masterKey, skipIndexes)
      skipIndexes.push(...newAddresses.map((address) => address.index))

      const addressesToCheckIfActive = newAddresses.map((address) => address.hash)
      const results = await getActiveAddressesResults(addressesToCheckIfActive, client)

      const { gap, activeAddresses: newActiveAddresses } = getGapFromLastActiveAddress(
        newAddresses,
        results,
        gapPerGroup
      )
      gapPerGroup = gap
      activeAddresses.push(...newActiveAddresses)
    }
  }

  return activeAddresses
}

const deriveAddressesInGroup = (
  group: number,
  amount: number,
  masterKey: BIP32Interface,
  skipIndexes: number[]
): AddressKeyPair[] => {
  const addresses = []
  const skipAddressIndexes = Array.from(skipIndexes)

  for (let j = 0; j < amount; j++) {
    const newAddress = deriveNewAddressData(masterKey, group, undefined, skipAddressIndexes)
    addresses.push(newAddress)
    skipAddressIndexes.push(newAddress.index)
  }

  return addresses
}

const splitResultsArrayIntoOneArrayPerGroup = (array: boolean[], chunkSize: number): boolean[][] => {
  const chunks = []
  let i = 0

  while (i < array.length) {
    chunks.push(array.slice(i, i + chunkSize))
    i += chunkSize
  }

  return chunks
}

const getGapFromLastActiveAddress = (
  addresses: AddressKeyPair[],
  results: boolean[],
  startingGap = 0
): { gap: number; activeAddresses: AddressKeyPair[] } => {
  let gap = startingGap
  const activeAddresses = []

  for (let j = 0; j < addresses.length; j++) {
    const address = addresses[j]
    const isActive = results[j]

    if (isActive) {
      activeAddresses.push(address)
      gap = 0
    } else {
      gap++
    }
  }

  return {
    gap,
    activeAddresses
  }
}

const getActiveAddressesResults = async (
  addressesToCheckIfActive: string[],
  client: ExplorerClient
): Promise<boolean[]> => {
  const QUERY_LIMIT = 80
  const results: boolean[] = []
  let queryPage = 0

  while (addressesToCheckIfActive.length > results.length) {
    const addressesToQuery = addressesToCheckIfActive.slice(queryPage * QUERY_LIMIT, ++queryPage * QUERY_LIMIT)
    const response = await client.addressesActive.postAddressesActive(addressesToQuery)
    results.push(...response.data)
  }

  return results
}
